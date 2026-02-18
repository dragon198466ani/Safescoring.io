#!/usr/bin/env python3
"""
Daemon script to regenerate norm summaries.
Runs in background even after PC restart (via Task Scheduler).
Use .pyw extension to run without console window.
"""
import os
import sys
import time
import logging
from datetime import datetime

# Setup logging to file
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'regen_daemon.log')
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Change to script directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Add to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    logging.info("=" * 60)
    logging.info("REGEN DAEMON STARTED")
    logging.info("=" * 60)

    try:
        # Import and run the regeneration script
        from scripts.regenerate_from_docs import main as regen_main
        regen_main()
        logging.info("Regeneration completed successfully")
    except Exception as e:
        logging.error(f"Error during regeneration: {e}")
        import traceback
        logging.error(traceback.format_exc())

    logging.info("DAEMON FINISHED")

if __name__ == '__main__':
    main()
