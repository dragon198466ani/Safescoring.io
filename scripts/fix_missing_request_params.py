#!/usr/bin/env python3
"""
Fix handlers that are missing request parameter

This script:
1. Finds HTTP handlers without request parameter: export async function GET() {
2. Adds the req parameter: export async function GET(req) {
3. Adds rate-limiting check at the beginning of the function
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent / "web" / "app" / "api" / "user"

def fix_handler_without_param(content, handler_name):
    """Add request parameter and rate-limiting to handler without params"""

    # Pattern: export async function GET() { or export function GET() {
    pattern = r'(export\s+(?:async\s+)?function\s+' + handler_name + r'\s*)\(\s*\)\s*{'

    if not re.search(pattern, content):
        return content, False

    print(f"    Fixing {handler_name} handler (adding req parameter + rate-limiting)")

    # Replace () with (req) and add rate-limiting
    replacement = r'\g<1>(req) {\n' + '''  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  '''

    content = re.sub(pattern, replacement, content)
    return content, True

def process_file(filepath):
    """Process a single file"""

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if rate-limiting import exists
    if 'applyUserRateLimit' not in content:
        return False

    # Check if handlers without params exist
    handlers = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    modified = False

    for handler in handlers:
        content, changed = fix_handler_without_param(content, handler)
        if changed:
            modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True

    return False

def main():
    print("=" * 60)
    print("Fixing handlers with missing request parameters")
    print("=" * 60)

    route_files = list(BASE_DIR.rglob("route.js"))
    fixed_count = 0

    for route_file in sorted(route_files):
        relative_path = route_file.relative_to(BASE_DIR.parent.parent.parent)

        # Skip backup files
        if '.backup' in str(route_file):
            continue

        if process_file(route_file):
            print(f"  [FIXED] {relative_path}")
            fixed_count += 1

    print("\n" + "=" * 60)
    print(f"Fixed {fixed_count} files")
    print("=" * 60)

if __name__ == "__main__":
    main()
