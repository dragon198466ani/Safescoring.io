import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Blockchain Donation Sync Cron Job
 *
 * POST /api/cron/sync-donations
 *
 * Syncs incoming donations from Bitcoin and Ethereum addresses.
 * Called periodically (e.g., every 15 minutes) via Vercel Cron or external scheduler.
 *
 * Security: Requires CRON_SECRET header with timing-safe verification
 */

/**
 * SECURITY: Constant-time comparison for cron secret
 */
function verifyCronSecret(providedSecret) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !providedSecret) {
    return false;
  }

  try {
    const provided = Buffer.from(providedSecret);
    const expected = Buffer.from(expectedSecret);

    if (provided.length !== expected.length) {
      crypto.timingSafeEqual(expected, expected);
      return false;
    }

    return crypto.timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

// API endpoints for blockchain data
const BLOCKCHAIN_APIS = {
  bitcoin: {
    // Blockstream API (free, no key required)
    txList: (address) => `https://blockstream.info/api/address/${address}/txs`,
    price: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
  },
  ethereum: {
    // Etherscan API (free tier: 5 calls/sec)
    txList: (address, apiKey) =>
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`,
    price: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
  },
};

// Lazy Supabase initialization
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Fetch current crypto prices
async function getCryptoPrices() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd",
      { next: { revalidate: 300 } } // Cache 5 min
    );
    const data = await response.json();
    return {
      btc: data.bitcoin?.usd || 42000,
      eth: data.ethereum?.usd || 2200,
    };
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    // Fallback prices
    return { btc: 42000, eth: 2200 };
  }
}

// Sync Bitcoin donations
async function syncBitcoinDonations(supabase, address, lastSyncedBlock, btcPrice) {
  const newDonations = [];

  try {
    const response = await fetch(BLOCKCHAIN_APIS.bitcoin.txList(address));
    if (!response.ok) throw new Error(`Blockstream API error: ${response.status}`);

    const transactions = await response.json();

    for (const tx of transactions) {
      // Skip if already processed
      if (lastSyncedBlock && tx.status?.block_height <= lastSyncedBlock) continue;

      // Find outputs to our address
      for (const vout of tx.vout || []) {
        if (vout.scriptpubkey_address === address) {
          const amountBtc = vout.value / 100000000; // Satoshis to BTC
          const amountUsd = amountBtc * btcPrice;

          // Only record if > $1 to filter dust
          if (amountUsd >= 1) {
            newDonations.push({
              tx_hash: tx.txid,
              from_address: tx.vin?.[0]?.prevout?.scriptpubkey_address || "unknown",
              to_address: address,
              amount_original: amountBtc,
              amount_usd: amountUsd,
              currency: "BTC",
              source: "crypto_btc",
              network: "bitcoin",
              block_number: tx.status?.block_height,
              block_timestamp: tx.status?.block_time
                ? new Date(tx.status.block_time * 1000).toISOString()
                : new Date().toISOString(),
              status: tx.status?.confirmed ? "confirmed" : "pending",
            });
          }
        }
      }
    }

    // Get highest block for next sync
    const maxBlock = Math.max(...transactions.map((tx) => tx.status?.block_height || 0), lastSyncedBlock || 0);

    return { donations: newDonations, lastBlock: maxBlock };
  } catch (error) {
    console.error("Error syncing Bitcoin donations:", error);
    return { donations: [], lastBlock: lastSyncedBlock };
  }
}

// Sync Ethereum donations
async function syncEthereumDonations(supabase, address, lastSyncedBlock, ethPrice) {
  const newDonations = [];
  const apiKey = process.env.ETHERSCAN_API_KEY || "";

  try {
    const response = await fetch(BLOCKCHAIN_APIS.ethereum.txList(address, apiKey));
    if (!response.ok) throw new Error(`Etherscan API error: ${response.status}`);

    const data = await response.json();

    if (data.status !== "1" || !data.result) {
      console.warn("Etherscan returned no results or error:", data.message);
      return { donations: [], lastBlock: lastSyncedBlock };
    }

    for (const tx of data.result) {
      // Only incoming transactions
      if (tx.to?.toLowerCase() !== address.toLowerCase()) continue;

      // Skip if already processed
      const blockNum = parseInt(tx.blockNumber);
      if (lastSyncedBlock && blockNum <= lastSyncedBlock) continue;

      // Skip failed transactions
      if (tx.isError === "1") continue;

      const amountEth = parseInt(tx.value) / 1e18; // Wei to ETH
      const amountUsd = amountEth * ethPrice;

      // Only record if > $1
      if (amountUsd >= 1) {
        newDonations.push({
          tx_hash: tx.hash,
          from_address: tx.from,
          to_address: tx.to,
          amount_original: amountEth,
          amount_usd: amountUsd,
          currency: "ETH",
          source: "crypto_eth",
          network: "ethereum",
          block_number: blockNum,
          block_timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          status: "confirmed",
        });
      }
    }

    // Get highest block
    const maxBlock = Math.max(
      ...data.result.map((tx) => parseInt(tx.blockNumber) || 0),
      lastSyncedBlock || 0
    );

    return { donations: newDonations, lastBlock: maxBlock };
  } catch (error) {
    console.error("Error syncing Ethereum donations:", error);
    return { donations: [], lastBlock: lastSyncedBlock };
  }
}

export async function POST(request) {
  // Verify cron secret with timing-safe comparison
  const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace("Bearer ", "");

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const results = { btc: { synced: 0, errors: [] }, eth: { synced: 0, errors: [] } };

  try {
    // Get donation addresses to monitor
    const { data: addresses, error: addressError } = await supabase
      .from("donation_addresses")
      .select("*")
      .eq("is_active", true);

    if (addressError) {
      console.error("Error fetching donation addresses:", addressError);
      return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
    }

    if (!addresses || addresses.length === 0) {
      return NextResponse.json({ message: "No addresses configured", results });
    }

    // Get current prices
    const prices = await getCryptoPrices();

    // Process each address
    for (const addr of addresses) {
      let syncResult;

      if (addr.network === "bitcoin") {
        syncResult = await syncBitcoinDonations(
          supabase,
          addr.address,
          addr.last_synced_block,
          prices.btc
        );

        // Insert new donations
        for (const donation of syncResult.donations) {
          const { error: insertError } = await supabase.from("donations").upsert(donation, {
            onConflict: "tx_hash,network",
            ignoreDuplicates: true,
          });

          if (insertError) {
            results.btc.errors.push(insertError.message);
          } else {
            results.btc.synced++;
          }
        }

        // Update last synced block
        if (syncResult.lastBlock > (addr.last_synced_block || 0)) {
          await supabase
            .from("donation_addresses")
            .update({
              last_synced_block: syncResult.lastBlock,
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", addr.id);
        }
      } else if (addr.network === "ethereum") {
        syncResult = await syncEthereumDonations(
          supabase,
          addr.address,
          addr.last_synced_block,
          prices.eth
        );

        // Insert new donations
        for (const donation of syncResult.donations) {
          const { error: insertError } = await supabase.from("donations").upsert(donation, {
            onConflict: "tx_hash,network",
            ignoreDuplicates: true,
          });

          if (insertError) {
            results.eth.errors.push(insertError.message);
          } else {
            results.eth.synced++;
          }
        }

        // Update last synced block
        if (syncResult.lastBlock > (addr.last_synced_block || 0)) {
          await supabase
            .from("donation_addresses")
            .update({
              last_synced_block: syncResult.lastBlock,
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", addr.id);
        }
      }
    }

    // Refresh donation stats materialized view
    const { error: refreshError } = await supabase.rpc("refresh_donation_stats");
    if (refreshError) {
      console.warn("Could not refresh donation stats:", refreshError.message);
    }

    const totalSynced = results.btc.synced + results.eth.synced;

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} new donation(s)`,
      results,
      prices,
    });
  } catch (error) {
    console.error("Error in donation sync:", error);
    return NextResponse.json({ error: "Sync failed", details: error.message }, { status: 500 });
  }
}

// Also support GET for manual testing (with secret)
export async function GET(request) {
  // Check secret from query param or header
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") || request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace("Bearer ", "");

  if (!verifyCronSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Forward to POST handler
  return POST(request);
}
