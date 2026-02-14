"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits as _parseUnits } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import {
  SAFEPASS_NFT_ABI,
  ERC20_ABI,
  TIERS,
  getTierInfo,
  getUSDCBalance,
  checkUSDCAllowance,
  getAddresses,
} from "@/libs/contracts";

/**
 * Button to mint SafePass NFT with USDC
 * Handles: wallet connection, USDC approval, and NFT minting
 */
export default function ButtonMintNFT({
  tier = "Explorer",
  className = "",
  onSuccess,
}) {
  const { address, isConnected, chain } = useAccount();
  const [tierInfo, setTierInfo] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [allowance, setAllowance] = useState("0");
  const [step, setStep] = useState("idle"); // idle, approving, minting, success
  const [_loading, setLoading] = useState(false);

  const tierLevel = TIERS[tier] ?? 0;
  const addresses = getAddresses(chain?.id);

  // Contract writes
  const { writeContract: approveUSDC, data: approveHash } = useWriteContract();
  const { writeContract: mintNFT, data: mintHash } = useWriteContract();

  // Wait for transactions
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  const { isSuccess: mintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  // Load tier info and balances
  useEffect(() => {
    async function load() {
      const info = await getTierInfo(tierLevel);
      setTierInfo(info);

      if (address) {
        const balance = await getUSDCBalance(address);
        setUsdcBalance(balance);

        if (addresses.safePassNFT) {
          const allow = await checkUSDCAllowance(address, addresses.safePassNFT);
          setAllowance(allow);
        }
      }
    }
    load();
  }, [address, tierLevel, chain?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle approve success
  useEffect(() => {
    if (approveSuccess && step === "approving") {
      toast.success("USDC approved!");
      setStep("idle");
      // Refresh allowance
      if (address && addresses.safePassNFT) {
        checkUSDCAllowance(address, addresses.safePassNFT).then(setAllowance);
      }
    }
  }, [approveSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle mint success
  useEffect(() => {
    if (mintSuccess && step === "minting") {
      toast.success(`SafePass ${tier} minted!`);
      setStep("success");
      onSuccess?.();
    }
  }, [mintSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsApproval =
    tierInfo && parseFloat(allowance) < parseFloat(tierInfo.priceUSDC);
  const hasEnoughBalance =
    tierInfo && parseFloat(usdcBalance) >= parseFloat(tierInfo.priceUSDC);

  const handleApprove = async () => {
    if (!tierInfo || !addresses.safePassNFT) return;

    setStep("approving");
    setLoading(true);

    try {
      approveUSDC({
        address: addresses.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [addresses.safePassNFT, tierInfo.priceRaw],
      });
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Approval failed");
      setStep("idle");
    }

    setLoading(false);
  };

  const handleMint = async () => {
    if (!addresses.safePassNFT) return;

    setStep("minting");
    setLoading(true);

    try {
      mintNFT({
        address: addresses.safePassNFT,
        abi: SAFEPASS_NFT_ABI,
        functionName: "mint",
        args: [tierLevel],
      });
    } catch (error) {
      console.error("Mint error:", error);
      toast.error("Minting failed");
      setStep("idle");
    }

    setLoading(false);
  };

  // Not connected - show connect button
  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button
            onClick={openConnectModal}
            className={`btn btn-primary ${className}`}
          >
            Connect Wallet
          </button>
        )}
      </ConnectButton.Custom>
    );
  }

  // Loading tier info
  if (!tierInfo) {
    return (
      <button className={`btn btn-disabled ${className}`} disabled>
        <span className="loading loading-spinner loading-sm"></span>
        Loading...
      </button>
    );
  }

  // Tier not available
  if (!tierInfo.active) {
    return (
      <button className={`btn btn-disabled ${className}`} disabled>
        Not Available
      </button>
    );
  }

  // Sold out
  if (tierInfo.maxSupply > 0 && tierInfo.remaining === 0) {
    return (
      <button className={`btn btn-disabled ${className}`} disabled>
        Sold Out
      </button>
    );
  }

  // Not enough USDC
  if (!hasEnoughBalance) {
    return (
      <button className={`btn btn-error ${className}`} disabled>
        Insufficient USDC (need ${tierInfo.priceUSDC})
      </button>
    );
  }

  // Success state
  if (step === "success") {
    return (
      <button className={`btn btn-success ${className}`} disabled>
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        Minted!
      </button>
    );
  }

  // Need approval first
  if (needsApproval) {
    return (
      <button
        onClick={handleApprove}
        disabled={step === "approving"}
        className={`btn btn-secondary ${className}`}
      >
        {step === "approving" ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Approving USDC...
          </>
        ) : (
          <>
            Approve ${tierInfo.priceUSDC} USDC
          </>
        )}
      </button>
    );
  }

  // Ready to mint
  return (
    <button
      onClick={handleMint}
      disabled={step === "minting"}
      className={`btn btn-primary ${className}`}
    >
      {step === "minting" ? (
        <>
          <span className="loading loading-spinner loading-sm"></span>
          Minting...
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Mint for ${tierInfo.priceUSDC} USDC
        </>
      )}
    </button>
  );
}
