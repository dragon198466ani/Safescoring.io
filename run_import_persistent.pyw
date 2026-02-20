"""
Persistent background import - runs without console window.
Double-click to start. Check data/import_log.txt for progress.
"""
import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Run the import script
subprocess.Popen(
    [sys.executable, 'scripts/background_import.py'],
    creationflags=subprocess.CREATE_NO_WINDOW,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
