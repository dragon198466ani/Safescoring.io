#!/usr/bin/env python3
"""Runner for smart evaluator"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from src.core.smart_evaluator import SmartEvaluator

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--type', type=int, help='Type ID to evaluate')
    parser.add_argument('--limit', type=int, help='Limit number of products')
    parser.add_argument('--resume', action='store_true', help='Skip already evaluated')
    args = parser.parse_args()

    evaluator = SmartEvaluator()
    evaluator.run(
        type_id=args.type,
        limit=args.limit,
        skip_evaluated=args.resume
    )
