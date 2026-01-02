#!/usr/bin/env python3
"""
SAFESCORING - Quick Marketing Automation Launcher
Usage: python run_marketing.py
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from src.marketing.auto_marketing import main

if __name__ == '__main__':
    main()
