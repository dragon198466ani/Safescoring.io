#!/usr/bin/env python3
"""
SAFESCORING.IO - Marketing Automation Module
Automated crypto news monitoring, content generation, and social media publishing.
"""

from .crypto_monitor import CryptoMonitor
from .content_generator import ContentGenerator
from .twitter_publisher import TwitterPublisher
from .auto_marketing import MarketingAutomation

__all__ = [
    'CryptoMonitor',
    'ContentGenerator',
    'TwitterPublisher',
    'MarketingAutomation'
]
