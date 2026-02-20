"""
Prediction Publisher - Blockchain Anchoring for Incident Predictions

This script:
1. Generates incident predictions for all products using ML model
2. Creates cryptographic commitment hashes (SHA-256)
3. Builds a Merkle tree of all predictions
4. Publishes the Merkle root to Polygon blockchain
5. Stores predictions with proofs in database

This creates irrefutable proof that predictions were made BEFORE incidents occur.

Usage:
    python src/automation/prediction_publisher.py --generate  # Generate predictions
    python src/automation/prediction_publisher.py --publish   # Publish to blockchain
    python src/automation/prediction_publisher.py --verify PREDICTION_ID  # Verify a prediction

Environment:
    SUPABASE_URL: Supabase project URL
    SUPABASE_SERVICE_KEY: Service role key
    POLYGON_RPC_URL: Polygon RPC endpoint
    PUBLISHER_PRIVATE_KEY: Wallet private key for publishing
"""

import os
import sys
import json
import hashlib
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from supabase import create_client, Client
except ImportError:
    print("Please install supabase: pip install supabase")
    sys.exit(1)

try:
    from web3 import Web3
    from eth_account import Account
    HAS_WEB3 = True
except ImportError:
    print("Web3 not available. Install with: pip install web3")
    HAS_WEB3 = False
    Web3 = None

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
POLYGON_RPC_URL = os.environ.get("POLYGON_RPC_URL", "https://polygon-rpc.com")
PUBLISHER_PRIVATE_KEY = os.environ.get("PUBLISHER_PRIVATE_KEY")

# Prediction Registry contract ABI (simplified)
REGISTRY_ABI = [
    {
        "inputs": [{"name": "merkleRoot", "type": "bytes32"}],
        "name": "publishPredictions",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "index", "type": "uint256"}],
        "name": "getPrediction",
        "outputs": [{"name": "", "type": "bytes32"}, {"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
]


class MerkleTree:
    """Simple Merkle tree implementation for prediction commitments."""

    def __init__(self, leaves: List[bytes]):
        """Initialize Merkle tree with leaf hashes."""
        self.leaves = leaves
        self.layers = [leaves]
        self._build_tree()

    def _build_tree(self):
        """Build the Merkle tree from leaves."""
        if not self.leaves:
            return

        current_layer = self.leaves

        while len(current_layer) > 1:
            next_layer = []

            for i in range(0, len(current_layer), 2):
                left = current_layer[i]
                right = current_layer[i + 1] if i + 1 < len(current_layer) else left

                # Concatenate and hash (sorted for consistency)
                combined = min(left, right) + max(left, right)
                parent = hashlib.sha256(combined).digest()
                next_layer.append(parent)

            self.layers.append(next_layer)
            current_layer = next_layer

    @property
    def root(self) -> bytes:
        """Get the Merkle root."""
        if not self.layers:
            return b'\x00' * 32
        return self.layers[-1][0] if self.layers[-1] else b'\x00' * 32

    def get_proof(self, index: int) -> List[bytes]:
        """Get Merkle proof for a leaf at given index."""
        if index >= len(self.leaves):
            raise IndexError("Leaf index out of range")

        proof = []
        current_index = index

        for layer in self.layers[:-1]:
            # Get sibling
            if current_index % 2 == 0:
                sibling_index = current_index + 1
            else:
                sibling_index = current_index - 1

            if sibling_index < len(layer):
                proof.append(layer[sibling_index])
            else:
                proof.append(layer[current_index])

            current_index = current_index // 2

        return proof

    @staticmethod
    def verify_proof(leaf: bytes, proof: List[bytes], root: bytes) -> bool:
        """Verify a Merkle proof."""
        computed = leaf

        for sibling in proof:
            combined = min(computed, sibling) + max(computed, sibling)
            computed = hashlib.sha256(combined).digest()

        return computed == root


class PredictionPublisher:
    """
    Publishes ML predictions to blockchain for proof-of-anteriority.

    Process:
    1. Generate predictions using IncidentPredictor
    2. Create commitment hash for each prediction
    3. Build Merkle tree
    4. Publish Merkle root to blockchain
    5. Store predictions with proofs in database
    """

    def __init__(self):
        """Initialize the prediction publisher."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Initialize Web3 if available
        if HAS_WEB3 and Web3 and POLYGON_RPC_URL:
            self.w3 = Web3(Web3.HTTPProvider(POLYGON_RPC_URL))
            if PUBLISHER_PRIVATE_KEY:
                self.account = Account.from_key(PUBLISHER_PRIVATE_KEY)
            else:
                self.account = None
        else:
            self.w3 = None
            self.account = None

        self.predictions = []
        self.merkle_tree = None

    def generate_predictions(self, prediction_window_days: int = 90) -> List[Dict]:
        """
        Generate incident predictions for all products.

        Args:
            prediction_window_days: Time window for prediction (default 90 days)

        Returns:
            List of prediction dicts
        """
        print("[*] Generating predictions...")

        # Load ML model
        try:
            from src.core.ml.incident_predictor import IncidentPredictor
            from src.core.ml.data_pipeline import DataPipeline

            pipeline = DataPipeline()
            predictor = IncidentPredictor.load("models/incident_predictor_v1.joblib")
        except Exception as e:
            print(f"[!] Could not load ML model: {e}")
            print("[*] Using rule-based predictions as fallback...")
            return self._generate_rule_based_predictions(prediction_window_days)

        # Get all products with scores
        products = self._get_products_with_scores()
        print(f"[+] Found {len(products)} products")

        predictions = []
        for product in products:
            try:
                # Create features
                features = self._create_features(product)

                # Get ML prediction
                result = predictor.predict(features)[0]

                prediction = {
                    "product_id": product["id"],
                    "product_slug": product["slug"],
                    "prediction_date": datetime.utcnow().isoformat(),
                    "safe_score_at_prediction": product.get("note_finale", 0),
                    "risk_level": result["risk_level"],
                    "incident_probability": result["incident_probability"],
                    "prediction_window_days": prediction_window_days,
                    "weakest_pillar": self._get_weakest_pillar(product),
                    "weakest_pillar_score": min(
                        product.get("score_s", 100),
                        product.get("score_a", 100),
                        product.get("score_f", 100),
                        product.get("score_e", 100),
                    ),
                    "confidence": result["confidence"],
                }

                predictions.append(prediction)

            except Exception as e:
                print(f"[!] Error predicting for {product.get('slug')}: {e}")
                continue

        print(f"[+] Generated {len(predictions)} predictions")
        self.predictions = predictions
        return predictions

    def _generate_rule_based_predictions(self, prediction_window_days: int) -> List[Dict]:
        """Generate predictions using rules (fallback when ML unavailable)."""
        products = self._get_products_with_scores()
        predictions = []

        for product in products:
            score = product.get("note_finale", 50)

            # Rule-based risk calculation
            if score < 40:
                risk_level = "CRITICAL"
                probability = 0.8
            elif score < 55:
                risk_level = "HIGH"
                probability = 0.6
            elif score < 70:
                risk_level = "MEDIUM"
                probability = 0.35
            elif score < 85:
                risk_level = "LOW"
                probability = 0.15
            else:
                risk_level = "MINIMAL"
                probability = 0.05

            prediction = {
                "product_id": product["id"],
                "product_slug": product["slug"],
                "prediction_date": datetime.utcnow().isoformat(),
                "safe_score_at_prediction": score,
                "risk_level": risk_level,
                "incident_probability": probability,
                "prediction_window_days": prediction_window_days,
                "weakest_pillar": self._get_weakest_pillar(product),
                "weakest_pillar_score": min(
                    product.get("score_s", 100),
                    product.get("score_a", 100),
                    product.get("score_f", 100),
                    product.get("score_e", 100),
                ),
                "confidence": 0.6,  # Lower confidence for rule-based
            }

            predictions.append(prediction)

        self.predictions = predictions
        return predictions

    def _get_products_with_scores(self) -> List[Dict]:
        """Get all products with their current scores."""
        result = self.supabase.table("products").select(
            "id, slug, name, product_type_id"
        ).eq("is_active", True).execute()

        products = result.data if result.data else []

        # Get scores
        score_result = self.supabase.table("safe_scoring_results").select(
            "product_id, note_finale, score_s, score_a, score_f, score_e"
        ).execute()

        scores_map = {s["product_id"]: s for s in (score_result.data or [])}

        # Merge
        for product in products:
            scores = scores_map.get(product["id"], {})
            product.update(scores)

        return products

    def _create_features(self, product: Dict) -> Dict:
        """Create feature dict for ML model."""
        return {
            "note_finale": product.get("note_finale", 50),
            "score_s": product.get("score_s", 50),
            "score_a": product.get("score_a", 50),
            "score_f": product.get("score_f", 50),
            "score_e": product.get("score_e", 50),
            "score_velocity": 0,
            "pillar_variance": 0,
            "weakest_pillar_score": min(
                product.get("score_s", 50),
                product.get("score_a", 50),
                product.get("score_f", 50),
                product.get("score_e", 50),
            ),
            "total_incidents": 0,
            "avg_severity": 0,
            "days_since_last": 9999,
            "incident_frequency": 0,
            "tbd_ratio": 0,
            "critical_norms_failed": 0,
            "avg_confidence": 0.7,
            "product_age_days": 365,
            "is_custodial": 0,
        }

    def _get_weakest_pillar(self, product: Dict) -> str:
        """Determine the weakest SAFE pillar."""
        pillars = {
            "S": product.get("score_s", 100),
            "A": product.get("score_a", 100),
            "F": product.get("score_f", 100),
            "E": product.get("score_e", 100),
        }
        return min(pillars, key=pillars.get)

    def create_commitment_hash(self, prediction: Dict) -> bytes:
        """Create a SHA-256 commitment hash for a prediction."""
        # Canonical JSON representation
        commitment_data = json.dumps({
            "product_id": prediction["product_id"],
            "prediction_date": prediction["prediction_date"],
            "risk_level": prediction["risk_level"],
            "incident_probability": round(prediction["incident_probability"], 4),
            "prediction_window_days": prediction["prediction_window_days"],
        }, sort_keys=True)

        return hashlib.sha256(commitment_data.encode()).digest()

    def build_merkle_tree(self) -> bytes:
        """Build Merkle tree from predictions and return root."""
        if not self.predictions:
            raise ValueError("No predictions to commit. Run generate_predictions first.")

        print("[*] Building Merkle tree...")

        # Create commitment hashes
        leaves = []
        for pred in self.predictions:
            commitment = self.create_commitment_hash(pred)
            pred["commitment_hash"] = commitment.hex()
            leaves.append(commitment)

        # Build tree
        self.merkle_tree = MerkleTree(leaves)
        merkle_root = self.merkle_tree.root

        print(f"[+] Merkle root: 0x{merkle_root.hex()}")
        print(f"[+] Total leaves: {len(leaves)}")

        return merkle_root

    def publish_to_blockchain(self, contract_address: str = None) -> Optional[str]:
        """
        Publish Merkle root to blockchain.

        Args:
            contract_address: PredictionRegistry contract address

        Returns:
            Transaction hash if successful, None otherwise
        """
        if not HAS_WEB3 or not self.w3:
            print("[!] Web3 not available. Skipping blockchain publication.")
            return None

        if not self.account:
            print("[!] No publisher private key configured. Skipping blockchain publication.")
            return None

        if not self.merkle_tree:
            raise ValueError("No Merkle tree. Run build_merkle_tree first.")

        if not contract_address:
            contract_address = os.environ.get("PREDICTION_REGISTRY_ADDRESS")

        if not contract_address:
            print("[!] No contract address configured. Skipping blockchain publication.")
            return None

        print(f"[*] Publishing to blockchain...")
        print(f"[*] Contract: {contract_address}")
        print(f"[*] Publisher: {self.account.address}")

        try:
            # Create contract instance
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=REGISTRY_ABI
            )

            # Build transaction
            merkle_root = self.merkle_tree.root
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            tx = contract.functions.publishPredictions(merkle_root).build_transaction({
                "from": self.account.address,
                "nonce": nonce,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            })

            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)

            print(f"[+] Transaction submitted: {tx_hash.hex()}")

            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            print(f"[+] Confirmed in block: {receipt['blockNumber']}")

            return tx_hash.hex()

        except Exception as e:
            print(f"[!] Blockchain publication failed: {e}")
            return None

    def save_predictions(self, tx_hash: str = None, block_number: int = None):
        """Save predictions to database with Merkle proofs."""
        if not self.predictions or not self.merkle_tree:
            raise ValueError("No predictions or Merkle tree. Generate and build first.")

        print("[*] Saving predictions to database...")

        merkle_root = self.merkle_tree.root.hex()
        batch_id = hashlib.sha256(
            f"{datetime.utcnow().isoformat()}:{merkle_root}".encode()
        ).hexdigest()[:16]

        saved_count = 0
        for i, pred in enumerate(self.predictions):
            try:
                # Get Merkle proof
                proof = self.merkle_tree.get_proof(i)
                proof_hex = [p.hex() for p in proof]

                # Prepare database record
                record = {
                    "product_id": pred["product_id"],
                    "prediction_date": pred["prediction_date"],
                    "safe_score_at_prediction": pred["safe_score_at_prediction"],
                    "risk_level": pred["risk_level"],
                    "incident_probability": pred["incident_probability"],
                    "prediction_window_days": pred["prediction_window_days"],
                    "weakest_pillar": pred["weakest_pillar"],
                    "weakest_pillar_score": pred["weakest_pillar_score"],
                    "confidence": pred["confidence"],
                    "commitment_hash": pred["commitment_hash"],
                    "merkle_root": merkle_root,
                    "merkle_proof": proof_hex,
                    "batch_id": batch_id,
                    "status": "active",
                }

                if tx_hash:
                    record["blockchain_tx_hash"] = tx_hash
                    record["blockchain_network"] = "polygon"
                if block_number:
                    record["blockchain_block_number"] = block_number

                # Upsert
                self.supabase.table("predictions").upsert(
                    record,
                    on_conflict="product_id,prediction_date"
                ).execute()

                saved_count += 1

            except Exception as e:
                print(f"[!] Error saving prediction for product {pred.get('product_id')}: {e}")

        print(f"[+] Saved {saved_count}/{len(self.predictions)} predictions")
        print(f"[+] Batch ID: {batch_id}")
        print(f"[+] Merkle root: 0x{merkle_root}")

        return batch_id

    def verify_prediction(self, prediction_id: str) -> Dict:
        """
        Verify a prediction's commitment and Merkle proof.

        Args:
            prediction_id: Prediction ID to verify

        Returns:
            Verification result dict
        """
        print(f"[*] Verifying prediction: {prediction_id}")

        # Get prediction
        result = self.supabase.table("predictions").select("*").eq(
            "id", prediction_id
        ).single().execute()

        if not result.data:
            return {"valid": False, "error": "Prediction not found"}

        pred = result.data

        # Verify commitment hash
        commitment_data = json.dumps({
            "product_id": pred["product_id"],
            "prediction_date": pred["prediction_date"],
            "risk_level": pred["risk_level"],
            "incident_probability": round(pred["incident_probability"], 4),
            "prediction_window_days": pred["prediction_window_days"],
        }, sort_keys=True)

        computed_hash = hashlib.sha256(commitment_data.encode()).hexdigest()
        hash_valid = computed_hash == pred["commitment_hash"]

        # Verify Merkle proof
        leaf = bytes.fromhex(pred["commitment_hash"])
        proof = [bytes.fromhex(p) for p in pred["merkle_proof"]]
        root = bytes.fromhex(pred["merkle_root"])
        proof_valid = MerkleTree.verify_proof(leaf, proof, root)

        # Check blockchain if available
        blockchain_valid = None
        if pred.get("blockchain_tx_hash") and self.w3:
            try:
                tx = self.w3.eth.get_transaction(pred["blockchain_tx_hash"])
                blockchain_valid = tx is not None
            except:
                blockchain_valid = False

        return {
            "valid": hash_valid and proof_valid,
            "commitment_hash_valid": hash_valid,
            "merkle_proof_valid": proof_valid,
            "blockchain_verified": blockchain_valid,
            "prediction": pred,
        }


def main():
    parser = argparse.ArgumentParser(description="SafeScoring Prediction Publisher")
    parser.add_argument("--generate", action="store_true", help="Generate predictions")
    parser.add_argument("--publish", action="store_true", help="Publish to blockchain")
    parser.add_argument("--verify", help="Verify a prediction by ID")
    parser.add_argument("--window", type=int, default=90, help="Prediction window in days")
    parser.add_argument("--contract", help="PredictionRegistry contract address")

    args = parser.parse_args()

    try:
        publisher = PredictionPublisher()

        if args.verify:
            result = publisher.verify_prediction(args.verify)
            print(f"\nVerification Result:")
            print(f"  Valid: {result['valid']}")
            print(f"  Commitment Hash Valid: {result['commitment_hash_valid']}")
            print(f"  Merkle Proof Valid: {result['merkle_proof_valid']}")
            print(f"  Blockchain Verified: {result['blockchain_verified']}")
            return

        if args.generate or args.publish:
            # Generate predictions
            predictions = publisher.generate_predictions(args.window)
            merkle_root = publisher.build_merkle_tree()

            tx_hash = None
            block_number = None

            # Publish to blockchain
            if args.publish:
                tx_hash = publisher.publish_to_blockchain(args.contract)

            # Save to database
            batch_id = publisher.save_predictions(tx_hash, block_number)

            print(f"\n[+] Publication complete!")
            print(f"[+] Predictions: {len(predictions)}")
            print(f"[+] Merkle Root: 0x{merkle_root.hex()}")
            if tx_hash:
                print(f"[+] Transaction: {tx_hash}")

        else:
            parser.print_help()

    except Exception as e:
        print(f"[!] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
