#!/usr/bin/env python3
"""
Script pour synchroniser automatiquement les récompenses staking
depuis les blockchains vers la base de données Supabase

Usage:
  python scripts/sync_staking_rewards.py

Configuration:
  - SUPABASE_URL: URL de votre projet Supabase
  - SUPABASE_SERVICE_KEY: Clé service role Supabase
  - WALLET_ADDRESSES: Adresses de vos wallets à surveiller
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta
from decimal import Decimal
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Adresses des wallets SASU (à configurer)
WALLET_ADDRESSES = {
    "ethereum": os.getenv("SASU_WALLET_ETH", ""),
    "solana": os.getenv("SASU_WALLET_SOL", ""),
    "polygon": os.getenv("SASU_WALLET_POLYGON", ""),
}

# APIs blockchain gratuites
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY", "")
POLYGONSCAN_API_KEY = os.getenv("POLYGONSCAN_API_KEY", "")


class StakingRewardsSyncer:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis")

        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.new_rewards = []

    def get_crypto_price(self, symbol: str) -> float:
        """
        Récupère le prix actuel d'une crypto en EUR via CoinGecko (gratuit)
        """
        coin_ids = {
            "ETH": "ethereum",
            "SOL": "solana",
            "MATIC": "matic-network",
            "DOT": "polkadot",
        }

        coin_id = coin_ids.get(symbol.upper())
        if not coin_id:
            print(f"⚠️  Crypto {symbol} non supportée")
            return 0.0

        try:
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=eur"
            response = requests.get(url, timeout=10)
            data = response.json()
            return float(data[coin_id]["eur"])
        except Exception as e:
            print(f"❌ Erreur récupération prix {symbol}: {e}")
            return 0.0

    def fetch_ethereum_staking(self):
        """
        Récupère les récompenses staking Ethereum (Lido, Rocket Pool, etc.)
        """
        wallet = WALLET_ADDRESSES.get("ethereum")
        if not wallet or not ETHERSCAN_API_KEY:
            print("⚠️  Wallet Ethereum ou API key Etherscan non configurés")
            return

        print(f"🔍 Recherche récompenses ETH pour {wallet[:10]}...")

        # Exemple: récupération des transactions internes (staking rewards)
        # Note: Ceci est un exemple simplifié, adapter selon votre setup staking
        url = f"https://api.etherscan.io/api"
        params = {
            "module": "account",
            "action": "txlistinternal",
            "address": wallet,
            "startblock": 0,
            "endblock": 99999999,
            "sort": "desc",
            "apikey": ETHERSCAN_API_KEY,
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if data["status"] != "1":
                print(f"⚠️  Pas de données Etherscan: {data.get('message')}")
                return

            # Filtrer les transactions liées au staking
            # (adapter selon votre protocole de staking)
            staking_txs = [
                tx for tx in data.get("result", [])
                if tx.get("from") in [
                    "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",  # Lido
                    "0x00000000219ab540356cbb839cbe05303d7705fa",  # Ethereum staking
                ]
            ]

            for tx in staking_txs[:10]:  # Dernières 10 récompenses
                amount_eth = Decimal(tx["value"]) / Decimal(10**18)
                date = datetime.fromtimestamp(int(tx["timeStamp"]))

                # Vérifier si déjà enregistré
                existing = self.supabase.table("staking_rewards").select("id").eq("tx_hash", tx["hash"]).execute()

                if not existing.data:
                    price_eur = self.get_crypto_price("ETH")
                    value_eur = float(amount_eth) * price_eur

                    self.new_rewards.append({
                        "crypto": "ETH",
                        "amount": float(amount_eth),
                        "value_eur": round(value_eur, 2),
                        "date": date.date().isoformat(),
                        "tx_hash": tx["hash"],
                        "source": "lido_etherscan",
                    })

                    print(f"  ✅ Nouvelle récompense: {amount_eth:.6f} ETH ({value_eur:.2f}€)")

        except Exception as e:
            print(f"❌ Erreur fetch Ethereum: {e}")

    def fetch_solana_staking(self):
        """
        Récupère les récompenses staking Solana
        """
        wallet = WALLET_ADDRESSES.get("solana")
        if not wallet:
            print("⚠️  Wallet Solana non configuré")
            return

        print(f"🔍 Recherche récompenses SOL pour {wallet[:10]}...")

        # Utiliser l'API Solana RPC publique
        url = "https://api.mainnet-beta.solana.com"

        try:
            # Récupérer les signatures de transactions récentes
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getSignaturesForAddress",
                "params": [
                    wallet,
                    {"limit": 20}
                ]
            }

            response = requests.post(url, json=payload, timeout=10)
            data = response.json()

            if "result" not in data:
                print("⚠️  Pas de transactions Solana trouvées")
                return

            # Analyser chaque transaction pour trouver les récompenses staking
            for sig_info in data["result"]:
                signature = sig_info["signature"]

                # Récupérer détails de la transaction
                tx_payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getTransaction",
                    "params": [
                        signature,
                        {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}
                    ]
                }

                tx_response = requests.post(url, json=tx_payload, timeout=10)
                tx_data = tx_response.json()

                if "result" in tx_data and tx_data["result"]:
                    # Analyser les récompenses (rewards)
                    rewards = tx_data["result"].get("meta", {}).get("rewards", [])

                    for reward in rewards:
                        if reward.get("rewardType") == "staking":
                            amount_lamports = reward.get("lamports", 0)
                            amount_sol = Decimal(amount_lamports) / Decimal(10**9)

                            timestamp = tx_data["result"].get("blockTime")
                            date = datetime.fromtimestamp(timestamp) if timestamp else datetime.now()

                            # Vérifier si déjà enregistré
                            existing = self.supabase.table("staking_rewards").select("id").eq("tx_hash", signature).execute()

                            if not existing.data and amount_sol > 0:
                                price_eur = self.get_crypto_price("SOL")
                                value_eur = float(amount_sol) * price_eur

                                self.new_rewards.append({
                                    "crypto": "SOL",
                                    "amount": float(amount_sol),
                                    "value_eur": round(value_eur, 2),
                                    "date": date.date().isoformat(),
                                    "tx_hash": signature,
                                    "source": "solana_rpc",
                                })

                                print(f"  ✅ Nouvelle récompense: {amount_sol:.6f} SOL ({value_eur:.2f}€)")

        except Exception as e:
            print(f"❌ Erreur fetch Solana: {e}")

    def fetch_polygon_staking(self):
        """
        Récupère les récompenses staking Polygon (MATIC)
        """
        wallet = WALLET_ADDRESSES.get("polygon")
        if not wallet or not POLYGONSCAN_API_KEY:
            print("⚠️  Wallet Polygon ou API key Polygonscan non configurés")
            return

        print(f"🔍 Recherche récompenses MATIC pour {wallet[:10]}...")

        # Similaire à Ethereum, adapter selon votre protocole de staking
        url = f"https://api.polygonscan.com/api"
        params = {
            "module": "account",
            "action": "txlistinternal",
            "address": wallet,
            "startblock": 0,
            "endblock": 99999999,
            "sort": "desc",
            "apikey": POLYGONSCAN_API_KEY,
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if data["status"] != "1":
                print(f"⚠️  Pas de données Polygonscan: {data.get('message')}")
                return

            # Traitement similaire à Ethereum
            # À adapter selon votre setup

        except Exception as e:
            print(f"❌ Erreur fetch Polygon: {e}")

    def save_rewards(self):
        """
        Sauvegarde les nouvelles récompenses dans Supabase
        """
        if not self.new_rewards:
            print("\n📊 Aucune nouvelle récompense à sauvegarder")
            return

        print(f"\n💾 Sauvegarde de {len(self.new_rewards)} nouvelles récompenses...")

        try:
            result = self.supabase.table("staking_rewards").insert(self.new_rewards).execute()
            print(f"✅ {len(self.new_rewards)} récompenses sauvegardées avec succès")

            # Résumé
            total_eur = sum(r["value_eur"] for r in self.new_rewards)
            print(f"\n📈 Total nouvelles récompenses: {total_eur:.2f}€")

            by_crypto = {}
            for r in self.new_rewards:
                crypto = r["crypto"]
                by_crypto[crypto] = by_crypto.get(crypto, 0) + r["value_eur"]

            print("\n💰 Par crypto:")
            for crypto, value in by_crypto.items():
                print(f"  - {crypto}: {value:.2f}€")

        except Exception as e:
            print(f"❌ Erreur sauvegarde: {e}")

    def run(self):
        """
        Exécute la synchronisation complète
        """
        print("🚀 Synchronisation des récompenses staking...\n")

        self.fetch_ethereum_staking()
        self.fetch_solana_staking()
        self.fetch_polygon_staking()

        self.save_rewards()

        print("\n✅ Synchronisation terminée!")


def main():
    """Point d'entrée principal"""
    try:
        syncer = StakingRewardsSyncer()
        syncer.run()
    except Exception as e:
        print(f"❌ Erreur: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
