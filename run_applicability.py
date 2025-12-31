#!/usr/bin/env python3
"""Runner for applicability generator"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.dirname(__file__))

from src.core.applicability_generator import ApplicabilityGenerator

if __name__ == "__main__":
    generator = ApplicabilityGenerator()
    generator.run()
