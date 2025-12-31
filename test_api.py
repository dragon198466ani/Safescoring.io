#!/usr/bin/env python3
"""Quick test of AI APIs"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.core.api_provider import AIProvider

print("Testing AI APIs...")
ai = AIProvider()
result = ai.call("Reply with just: OK", max_tokens=10)
print(f"Result: {result}")
