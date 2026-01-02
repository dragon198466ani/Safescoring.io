#!/usr/bin/env python3
"""
Fix bare except clauses in Python files.
Replaces 'except:' with 'except Exception:' for better error handling.

Usage:
    python scripts/fixes/fix_bare_except.py --dry-run  # Preview changes
    python scripts/fixes/fix_bare_except.py            # Apply changes
"""

import os
import re
import sys
import argparse
from pathlib import Path

# Files/directories to skip
SKIP_DIRS = {'.git', '__pycache__', 'node_modules', '.venv', 'venv', '_archive'}
SKIP_FILES = {'fix_bare_except.py'}  # Don't modify this script


def find_python_files(root_dir):
    """Find all Python files in directory."""
    python_files = []
    for root, dirs, files in os.walk(root_dir):
        # Skip certain directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for file in files:
            if file.endswith('.py') and file not in SKIP_FILES:
                python_files.append(os.path.join(root, file))

    return python_files


def fix_bare_except(content, filepath):
    """
    Fix bare except clauses in Python code.

    Returns:
        tuple: (fixed_content, list of changes made)
    """
    changes = []
    lines = content.split('\n')
    fixed_lines = []

    # Pattern to match bare except
    bare_except_pattern = re.compile(r'^(\s*)except:\s*(#.*)?$')

    for i, line in enumerate(lines):
        match = bare_except_pattern.match(line)
        if match:
            indent = match.group(1)
            comment = match.group(2) or ''

            # Determine what exception type to use based on context
            # Look at the try block to understand what we're catching
            exception_type = 'Exception'

            # Check previous lines for context
            context_lines = '\n'.join(lines[max(0, i-10):i])

            # If it's a requests/HTTP call, be more specific
            if 'requests.' in context_lines or 'urllib' in context_lines:
                exception_type = '(requests.exceptions.RequestException, Exception)'
            elif 'json.' in context_lines or 'JSON' in context_lines:
                exception_type = '(json.JSONDecodeError, Exception)'
            elif 'open(' in context_lines or 'file' in context_lines.lower():
                exception_type = '(IOError, OSError, Exception)'

            # Build the fixed line
            if comment:
                fixed_line = f"{indent}except {exception_type}:  {comment}"
            else:
                fixed_line = f"{indent}except {exception_type}:"

            fixed_lines.append(fixed_line)
            changes.append({
                'line': i + 1,
                'original': line,
                'fixed': fixed_line
            })
        else:
            fixed_lines.append(line)

    return '\n'.join(fixed_lines), changes


def process_file(filepath, dry_run=False):
    """Process a single Python file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  Error reading {filepath}: {e}")
        return 0

    fixed_content, changes = fix_bare_except(content, filepath)

    if not changes:
        return 0

    print(f"\n{filepath}:")
    for change in changes:
        print(f"  Line {change['line']}:")
        print(f"    - {change['original'].strip()}")
        print(f"    + {change['fixed'].strip()}")

    if not dry_run:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"  [OK] Fixed {len(changes)} bare except(s)")
        except Exception as e:
            print(f"  [ERROR] Error writing: {e}")
            return 0

    return len(changes)


def main():
    parser = argparse.ArgumentParser(description='Fix bare except clauses in Python files')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without modifying files')
    parser.add_argument('--path', default='src', help='Directory to scan (default: src)')
    args = parser.parse_args()

    # Get project root (parent of scripts directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    target_dir = project_root / args.path

    if not target_dir.exists():
        print(f"Error: Directory {target_dir} does not exist")
        sys.exit(1)

    print(f"Scanning {target_dir} for bare except clauses...")
    if args.dry_run:
        print("(DRY RUN - no files will be modified)\n")

    python_files = find_python_files(target_dir)
    total_fixes = 0

    for filepath in python_files:
        fixes = process_file(filepath, args.dry_run)
        total_fixes += fixes

    print(f"\n{'=' * 50}")
    if args.dry_run:
        print(f"Found {total_fixes} bare except clause(s) to fix")
        print("Run without --dry-run to apply fixes")
    else:
        print(f"Fixed {total_fixes} bare except clause(s)")


if __name__ == '__main__':
    main()
