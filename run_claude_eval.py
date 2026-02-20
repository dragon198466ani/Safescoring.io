#!/usr/bin/env python3
"""
SAFESCORING - Evaluation via Claude Code CLI
Uses Claude Code subscription (no API keys needed).
Requires: Claude Code CLI installed and authenticated.

Usage:
    python run_claude_eval.py                           # Evaluate all products
    python run_claude_eval.py --product "Ledger Nano X" # Evaluate one product
    python run_claude_eval.py --limit 5 --resume        # Evaluate 5, skip done
    python run_claude_eval.py --model opus              # Use Opus model
"""
import sys
import os
import argparse
import subprocess

sys.path.insert(0, os.path.dirname(__file__))

# Force CLAUDE_CODE_ONLY mode
os.environ['CLAUDE_CODE_ONLY'] = 'true'


def get_claude_cmd():
    """Get the correct Claude CLI command for the current platform."""
    import shutil
    import platform
    if platform.system() == 'Windows':
        return shutil.which('claude.cmd') or shutil.which('claude') or 'claude.cmd'
    return shutil.which('claude') or 'claude'


def check_claude_cli():
    """Verify Claude Code CLI is installed and working."""
    try:
        claude_cmd = get_claude_cmd()
        r = subprocess.run(
            [claude_cmd, '--version'],
            capture_output=True, text=True, timeout=10,
            encoding='utf-8'
        )
        if r.returncode == 0:
            version = r.stdout.strip()
            print(f"  Claude Code CLI: {version}")
            return True
        else:
            print("ERROR: Claude Code CLI returned error.")
            print(f"  stderr: {r.stderr[:200] if r.stderr else 'none'}")
            print("  Run: claude doctor")
            return False
    except FileNotFoundError:
        print("ERROR: Claude Code CLI not found.")
        print("  Install: npm install -g @anthropic-ai/claude-code")
        return False
    except subprocess.TimeoutExpired:
        print("ERROR: Claude Code CLI timed out.")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='SAFESCORING - Evaluate products with Claude Code CLI'
    )
    parser.add_argument('--product', type=str, help='Product name to evaluate')
    parser.add_argument('--type', type=int, help='Product type ID to filter')
    parser.add_argument('--limit', type=int, help='Max products to evaluate')
    parser.add_argument('--resume', action='store_true', help='Skip already evaluated products')
    parser.add_argument('--model', type=str, default='sonnet',
                        choices=['haiku', 'sonnet', 'opus'],
                        help='Claude model for standard evals (default: sonnet)')
    parser.add_argument('--expert-model', type=str, default=None,
                        choices=['haiku', 'sonnet', 'opus'],
                        help='Claude model for expert/critical evals (default: same as --model)')
    parser.add_argument('--no-score', action='store_true',
                        help='Skip score calculation after evaluation')
    parser.add_argument('--no-narrative', action='store_true',
                        help='Skip narrative generation after scoring')
    parser.add_argument('--no-setup-narrative', action='store_true',
                        help='Skip setup (combination) narrative generation')
    parser.add_argument('--setup-only', action='store_true',
                        help='Only generate setup narratives (skip product eval/score/narrative)')
    args = parser.parse_args()

    print("""
================================================================
     SAFE SCORING - CLAUDE CODE CLI EVALUATOR
     Mode: CLAUDE_CODE_ONLY (subscription-based)
     No API keys required
================================================================
""")

    # Check CLI availability
    if not check_claude_cli():
        sys.exit(1)

    # Set model preferences via environment
    os.environ['CLAUDE_CODE_MODEL'] = args.model
    if args.expert_model:
        os.environ['CLAUDE_CODE_MODEL_EXPERT'] = args.expert_model
    else:
        os.environ['CLAUDE_CODE_MODEL_EXPERT'] = args.model

    print(f"  Model: {args.model}")
    print(f"  Expert model: {args.expert_model or args.model}")
    print(f"  Resume: {args.resume}")
    if args.product:
        print(f"  Product: {args.product}")
    if args.type:
        print(f"  Type ID: {args.type}")
    if args.limit:
        print(f"  Limit: {args.limit}")
    print()

    # --setup-only mode: skip product evaluation/scoring/narrative
    if not args.setup_only:
        # Import after setting env vars
        from src.core.smart_evaluator import SmartEvaluator

        evaluator = SmartEvaluator()
        evaluator.run(
            product_name=args.product,
            type_id=args.type,
            limit=args.limit,
            skip_evaluated=args.resume,
        )

        # After evaluation, calculate scores automatically
        if not args.no_score:
            print("\n" + "=" * 60)
            print("[SCORE] Calculating SAFE scores...")
            print("=" * 60)
            from src.core.score_calculator import ScoreCalculator
            calculator = ScoreCalculator()
            calculator.run()
            print("\n[SCORE] Done - scores visible on website")
        else:
            print("\n[SCORE] Skipped (--no-score flag)")

        # After scoring, generate strategic narratives (per-product)
        if not args.no_score and not args.no_narrative:
            print("\n" + "=" * 60)
            print("[NARRATIVE] Generating strategic analysis narratives...")
            print("=" * 60)
            from src.core.narrative_generator import NarrativeGenerator
            generator = NarrativeGenerator()
            generator.run(product_name=args.product, limit=args.limit)
            print("\n[NARRATIVE] Done - narratives visible on website")
        elif args.no_narrative:
            print("\n[NARRATIVE] Skipped (--no-narrative flag)")
    else:
        print("\n[SETUP-ONLY] Skipping product eval/score/narrative (--setup-only flag)")

    # After product narratives, generate setup (combination) narratives
    if not args.no_setup_narrative:
        print("\n" + "=" * 60)
        print("[SETUP-NARRATIVE] Generating setup combination narratives...")
        print("=" * 60)
        from src.core.setup_narrative_generator import SetupNarrativeGenerator
        setup_generator = SetupNarrativeGenerator()
        setup_generator.run(limit=args.limit)
        print("\n[SETUP-NARRATIVE] Done - setup narratives visible on website")
    else:
        print("\n[SETUP-NARRATIVE] Skipped (--no-setup-narrative flag)")


if __name__ == '__main__':
    main()
