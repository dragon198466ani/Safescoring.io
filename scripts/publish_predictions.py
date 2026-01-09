#!/usr/bin/env python3
"""
SafeScoring - Prediction Publisher

Generates risk predictions based on SAFE scores and publishes
commitment hashes to the blockchain for proof of anteriority.

Usage:
    python scripts/publish_predictions.py --generate     # Generate new predictions
    python scripts/publish_predictions.py --publish      # Publish to blockchain
    python scripts/publish_predictions.py --validate     # Validate expired predictions
    python scripts/publish_predictions.py --stats        # Show accuracy stats
    python scripts/publish_predictions.py --all          # Do everything
"""

import os
import sys
import json
import hashlib
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from decimal import Decimal

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from web3 import Web3
    from eth_account import Account
    HAS_WEB3 = True
except ImportError:
    HAS_WEB3 = False
    print("Warning: web3 not installed. Blockchain publishing disabled.")
    print("Install with: pip install web3")

try:
    from supabase import create_client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    print("Warning: supabase not installed.")
    print("Install with: pip install supabase")


class PredictionPublisher:
    """
    Generates and publishes cryptographic prediction commitments.
    """

    # Risk level mapping
    RISK_LEVELS = {
        'CRITICAL': 4,
        'HIGH': 3,
        'MEDIUM': 2,
        'LOW': 1,
        'MINIMAL': 0
    }

    # Score to risk mapping
    SCORE_RISK_THRESHOLDS = [
        (40, 'CRITICAL', 0.75),   # Score < 40 = Critical risk, 75% incident probability
        (55, 'HIGH', 0.50),       # Score < 55 = High risk, 50% probability
        (70, 'MEDIUM', 0.25),     # Score < 70 = Medium risk, 25% probability
        (85, 'LOW', 0.10),        # Score < 85 = Low risk, 10% probability
        (100, 'MINIMAL', 0.02),   # Score >= 85 = Minimal risk, 2% probability
    ]

    def __init__(self):
        self.supabase = None
        self.web3 = None
        self.contract = None
        self.account = None

        self._init_supabase()
        self._init_web3()

    def _init_supabase(self):
        """Initialize Supabase client."""
        if not HAS_SUPABASE:
            return

        url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

        if url and key:
            self.supabase = create_client(url, key)
            print(f"[+] Supabase connected")
        else:
            print("[-] Supabase credentials not found")

    def _init_web3(self):
        """Initialize Web3 connection."""
        if not HAS_WEB3:
            return

        # Try different RPC endpoints
        rpc_url = os.getenv('POLYGON_RPC_URL') or os.getenv('RPC_URL')

        if not rpc_url:
            # Default to Polygon mainnet public RPC
            rpc_url = 'https://polygon-rpc.com'

        self.web3 = Web3(Web3.HTTPProvider(rpc_url))

        if self.web3.is_connected():
            print(f"[+] Web3 connected to {rpc_url[:50]}...")
            print(f"    Chain ID: {self.web3.eth.chain_id}")
        else:
            print(f"[-] Web3 connection failed")
            self.web3 = None
            return

        # Load private key
        private_key = os.getenv('PUBLISHER_PRIVATE_KEY') or os.getenv('PRIVATE_KEY')
        if private_key:
            if not private_key.startswith('0x'):
                private_key = '0x' + private_key
            self.account = Account.from_key(private_key)
            print(f"[+] Publisher account: {self.account.address}")
        else:
            print("[-] No private key found (read-only mode)")

        # Load contract
        contract_address = os.getenv('PREDICTION_REGISTRY_ADDRESS')
        if contract_address:
            self._load_contract(contract_address)

    def _load_contract(self, address: str):
        """Load the PredictionRegistry contract."""
        # ABI for the functions we need
        abi = [
            {
                "inputs": [
                    {"name": "commitmentHash", "type": "bytes32"},
                    {"name": "productId", "type": "uint256"},
                    {"name": "riskLevel", "type": "uint8"},
                    {"name": "safeScore", "type": "uint8"},
                    {"name": "windowDays", "type": "uint16"}
                ],
                "name": "commitPrediction",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "hashes", "type": "bytes32[]"},
                    {"name": "productIds", "type": "uint256[]"},
                    {"name": "riskLevels", "type": "uint8[]"},
                    {"name": "safeScores", "type": "uint8[]"},
                    {"name": "windowDays", "type": "uint16[]"}
                ],
                "name": "commitPredictionsBatch",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getAccuracyStats",
                "outputs": [
                    {"name": "total", "type": "uint256"},
                    {"name": "validated", "type": "uint256"},
                    {"name": "correct", "type": "uint256"},
                    {"name": "incorrect", "type": "uint256"},
                    {"name": "accuracyBps", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "totalPredictions",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"name": "hash", "type": "bytes32"}],
                "name": "getPrediction",
                "outputs": [
                    {
                        "components": [
                            {"name": "commitmentHash", "type": "bytes32"},
                            {"name": "productId", "type": "uint256"},
                            {"name": "riskLevel", "type": "uint8"},
                            {"name": "safeScoreAtPrediction", "type": "uint8"},
                            {"name": "windowDays", "type": "uint16"},
                            {"name": "timestamp", "type": "uint64"},
                            {"name": "expiresAt", "type": "uint64"},
                            {"name": "validated", "type": "bool"},
                            {"name": "incidentOccurred", "type": "bool"},
                            {"name": "validatedAt", "type": "uint64"}
                        ],
                        "name": "",
                        "type": "tuple"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]

        self.contract = self.web3.eth.contract(
            address=Web3.to_checksum_address(address),
            abi=abi
        )
        print(f"[+] Contract loaded: {address}")

    def assess_risk(self, safe_score: float) -> Tuple[str, float, int]:
        """
        Assess risk level based on SAFE score.

        Returns:
            (risk_level, incident_probability, window_days)
        """
        for threshold, risk, probability in self.SCORE_RISK_THRESHOLDS:
            if safe_score < threshold:
                # Higher risk = shorter prediction window
                window_days = {
                    'CRITICAL': 90,
                    'HIGH': 180,
                    'MEDIUM': 270,
                    'LOW': 365,
                    'MINIMAL': 365
                }[risk]
                return risk, probability, window_days

        return 'MINIMAL', 0.02, 365

    def generate_commitment_hash(self, prediction_data: Dict) -> str:
        """
        Generate SHA-256 commitment hash for prediction data.
        """
        # Canonical JSON representation
        canonical = json.dumps(prediction_data, sort_keys=True, separators=(',', ':'))
        hash_bytes = hashlib.sha256(canonical.encode('utf-8')).digest()
        return '0x' + hash_bytes.hex()

    def fetch_products_for_prediction(self) -> List[Dict]:
        """Fetch products that need new predictions."""
        if not self.supabase:
            print("[-] Supabase not connected")
            return []

        # Get products with scores
        response = self.supabase.table('safe_scoring_results').select(
            'product_id, note_finale, score_s, score_a, score_f, score_e, calculated_at'
        ).order('calculated_at', desc=True).execute()

        if not response.data:
            return []

        # Get latest score per product
        latest = {}
        for score in response.data:
            pid = score['product_id']
            if pid not in latest:
                latest[pid] = score

        # Get product details
        product_ids = list(latest.keys())
        products_response = self.supabase.table('products').select(
            'id, name, slug'
        ).in_('id', product_ids).execute()

        products_map = {p['id']: p for p in (products_response.data or [])}

        # Combine data
        results = []
        for pid, score in latest.items():
            if pid in products_map:
                results.append({
                    'product_id': pid,
                    'name': products_map[pid]['name'],
                    'slug': products_map[pid]['slug'],
                    'safe_score': float(score['note_finale'] or 0),
                    'score_s': float(score['score_s'] or 0),
                    'score_a': float(score['score_a'] or 0),
                    'score_f': float(score['score_f'] or 0),
                    'score_e': float(score['score_e'] or 0),
                    'calculated_at': score['calculated_at']
                })

        return results

    def generate_predictions(self) -> List[Dict]:
        """Generate predictions for all products."""
        products = self.fetch_products_for_prediction()
        print(f"\n[*] Generating predictions for {len(products)} products...")

        predictions = []
        now = datetime.utcnow()

        for product in products:
            safe_score = product['safe_score']
            risk_level, probability, window_days = self.assess_risk(safe_score)

            # Find weakest pillar
            pillars = {
                'S': product['score_s'],
                'A': product['score_a'],
                'F': product['score_f'],
                'E': product['score_e']
            }
            weakest = min(pillars, key=pillars.get)

            prediction_data = {
                'version': '1.0',
                'methodology': 'SAFE-v2.0',
                'prediction_date': now.isoformat() + 'Z',
                'product_id': product['product_id'],
                'product_name': product['name'],
                'product_slug': product['slug'],
                'safe_score': safe_score,
                'pillars': pillars,
                'risk_level': risk_level,
                'incident_probability': probability,
                'window_days': window_days,
                'expires_at': (now + timedelta(days=window_days)).isoformat() + 'Z',
                'weakest_pillar': weakest,
                'weakest_pillar_score': pillars[weakest],
                'confidence': 0.85  # Base confidence level
            }

            commitment_hash = self.generate_commitment_hash(prediction_data)
            prediction_data['commitment_hash'] = commitment_hash

            predictions.append(prediction_data)

        # Sort by risk level (highest first)
        predictions.sort(key=lambda x: self.RISK_LEVELS.get(x['risk_level'], 0), reverse=True)

        return predictions

    def save_predictions_to_db(self, predictions: List[Dict]) -> int:
        """Save predictions to Supabase."""
        if not self.supabase:
            print("[-] Supabase not connected")
            return 0

        saved = 0
        for pred in predictions:
            try:
                self.supabase.table('predictions').insert({
                    'product_id': pred['product_id'],
                    'prediction_date': pred['prediction_date'],
                    'safe_score_at_prediction': pred['safe_score'],
                    'risk_level': pred['risk_level'],
                    'incident_probability': pred['incident_probability'],
                    'prediction_window_days': pred['window_days'],
                    'expires_at': pred['expires_at'],
                    'weakest_pillar': pred['weakest_pillar'],
                    'weakest_pillar_score': pred['weakest_pillar_score'],
                    'confidence': pred['confidence'],
                    'commitment_hash': pred['commitment_hash'],
                    'predictions_json': pred,
                    'methodology_version': pred['methodology'],
                    'status': 'active'
                }).execute()
                saved += 1
            except Exception as e:
                print(f"[-] Error saving prediction: {e}")

        return saved

    def publish_to_blockchain(self, predictions: List[Dict], batch_size: int = 10) -> Dict:
        """Publish prediction commitments to blockchain."""
        if not self.web3 or not self.contract or not self.account:
            print("[-] Blockchain not configured")
            return {'published': 0, 'failed': 0, 'txs': []}

        results = {'published': 0, 'failed': 0, 'txs': []}

        # Process in batches
        for i in range(0, len(predictions), batch_size):
            batch = predictions[i:i + batch_size]
            print(f"\n[*] Publishing batch {i // batch_size + 1} ({len(batch)} predictions)...")

            try:
                # Prepare batch data
                hashes = [Web3.to_bytes(hexstr=p['commitment_hash']) for p in batch]
                product_ids = [p['product_id'] for p in batch]
                risk_levels = [self.RISK_LEVELS[p['risk_level']] for p in batch]
                safe_scores = [int(p['safe_score']) for p in batch]
                window_days = [p['window_days'] for p in batch]

                # Build transaction
                nonce = self.web3.eth.get_transaction_count(self.account.address)
                gas_price = self.web3.eth.gas_price

                tx = self.contract.functions.commitPredictionsBatch(
                    hashes, product_ids, risk_levels, safe_scores, window_days
                ).build_transaction({
                    'from': self.account.address,
                    'nonce': nonce,
                    'gas': 500000 * len(batch),
                    'gasPrice': gas_price
                })

                # Sign and send
                signed = self.account.sign_transaction(tx)
                tx_hash = self.web3.eth.send_raw_transaction(signed.raw_transaction)
                print(f"    TX: {tx_hash.hex()}")

                # Wait for confirmation
                receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                print(f"    Confirmed in block {receipt['blockNumber']}")

                results['published'] += len(batch)
                results['txs'].append({
                    'hash': tx_hash.hex(),
                    'block': receipt['blockNumber'],
                    'count': len(batch)
                })

                # Update DB with blockchain info
                self._update_db_with_tx(batch, tx_hash.hex(), receipt)

            except Exception as e:
                print(f"[-] Batch failed: {e}")
                results['failed'] += len(batch)

        return results

    def _update_db_with_tx(self, predictions: List[Dict], tx_hash: str, receipt: Dict):
        """Update database with blockchain transaction info."""
        if not self.supabase:
            return

        for pred in predictions:
            try:
                self.supabase.table('predictions').update({
                    'blockchain_tx_hash': tx_hash,
                    'blockchain_network': 'polygon',
                    'blockchain_block_number': receipt['blockNumber'],
                    'blockchain_timestamp': datetime.utcnow().isoformat()
                }).eq('commitment_hash', pred['commitment_hash']).execute()
            except Exception as e:
                print(f"[-] DB update error: {e}")

    def get_blockchain_stats(self) -> Dict:
        """Get stats from blockchain contract."""
        if not self.contract:
            return {}

        try:
            stats = self.contract.functions.getAccuracyStats().call()
            return {
                'total': stats[0],
                'validated': stats[1],
                'correct': stats[2],
                'incorrect': stats[3],
                'accuracy_percent': stats[4] / 100  # Convert from basis points
            }
        except Exception as e:
            print(f"[-] Error getting stats: {e}")
            return {}

    def print_stats(self):
        """Print prediction accuracy stats."""
        print("\n" + "=" * 60)
        print("PREDICTION ACCURACY STATS")
        print("=" * 60)

        # Blockchain stats
        if self.contract:
            stats = self.get_blockchain_stats()
            if stats:
                print(f"\nOn-Chain Stats:")
                print(f"  Total Predictions:  {stats.get('total', 0)}")
                print(f"  Validated:          {stats.get('validated', 0)}")
                print(f"  Correct:            {stats.get('correct', 0)}")
                print(f"  Incorrect:          {stats.get('incorrect', 0)}")
                print(f"  Accuracy:           {stats.get('accuracy_percent', 0):.2f}%")

        # Database stats
        if self.supabase:
            try:
                response = self.supabase.table('predictions').select('*').execute()
                predictions = response.data or []

                total = len(predictions)
                active = len([p for p in predictions if p.get('status') == 'active'])
                validated = len([p for p in predictions if p.get('status') == 'validated'])

                print(f"\nDatabase Stats:")
                print(f"  Total Predictions:  {total}")
                print(f"  Active:             {active}")
                print(f"  Validated:          {validated}")

                # By risk level
                by_risk = {}
                for p in predictions:
                    risk = p.get('risk_level', 'UNKNOWN')
                    by_risk[risk] = by_risk.get(risk, 0) + 1

                print(f"\nBy Risk Level:")
                for risk in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']:
                    count = by_risk.get(risk, 0)
                    print(f"  {risk:10}: {count}")

            except Exception as e:
                print(f"[-] Database error: {e}")

        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='SafeScoring Prediction Publisher')
    parser.add_argument('--generate', action='store_true', help='Generate new predictions')
    parser.add_argument('--publish', action='store_true', help='Publish to blockchain')
    parser.add_argument('--validate', action='store_true', help='Validate expired predictions')
    parser.add_argument('--stats', action='store_true', help='Show accuracy stats')
    parser.add_argument('--all', action='store_true', help='Do everything')
    parser.add_argument('--dry-run', action='store_true', help='Generate without saving/publishing')

    args = parser.parse_args()

    publisher = PredictionPublisher()

    if args.stats or args.all:
        publisher.print_stats()

    if args.generate or args.all:
        print("\n[*] Generating predictions...")
        predictions = publisher.generate_predictions()

        print(f"\nGenerated {len(predictions)} predictions:")
        for risk in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']:
            count = len([p for p in predictions if p['risk_level'] == risk])
            if count > 0:
                print(f"  {risk}: {count}")

        # Show top risk predictions
        print("\nTop 5 Highest Risk:")
        for p in predictions[:5]:
            print(f"  [{p['risk_level']:8}] {p['product_name'][:30]:30} Score: {p['safe_score']:.0f}")

        if not args.dry_run:
            saved = publisher.save_predictions_to_db(predictions)
            print(f"\n[+] Saved {saved} predictions to database")

            if args.publish or args.all:
                print("\n[*] Publishing to blockchain...")
                results = publisher.publish_to_blockchain(predictions)
                print(f"\n[+] Published: {results['published']}, Failed: {results['failed']}")
        else:
            print("\n[DRY RUN] No changes made")

    if not any([args.generate, args.publish, args.validate, args.stats, args.all]):
        parser.print_help()


if __name__ == '__main__':
    main()
