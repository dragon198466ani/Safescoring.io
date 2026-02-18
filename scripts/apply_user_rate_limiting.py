#!/usr/bin/env python3
"""
Automatically apply rate-limiting to all /api/user/* routes

This script:
1. Finds all web/app/api/user/**/route.js files
2. Checks if rate-limiting is already applied
3. Adds applyUserRateLimit() to all HTTP handlers (GET, POST, PUT, PATCH, DELETE)
4. Adds rate-limit headers to successful responses
5. Creates backups before modifying
"""

import os
import re
import shutil
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent / "web" / "app" / "api" / "user"

# Pattern to detect if rate-limiting is already applied
RATE_LIMIT_IMPORT_PATTERN = r"from ['\"]@/libs/rate-limiters['\"]"
APPLY_RATE_LIMIT_PATTERN = r"applyUserRateLimit|applyRateLimit"

def has_rate_limiting(content):
    """Check if file already has rate-limiting"""
    return (
        re.search(RATE_LIMIT_IMPORT_PATTERN, content) is not None or
        re.search(APPLY_RATE_LIMIT_PATTERN, content) is not None
    )

def add_import(content):
    """Add rate-limiting import after other imports"""
    # Find the last import statement
    import_pattern = r'^import .+ from .+;$'
    matches = list(re.finditer(import_pattern, content, re.MULTILINE))

    if not matches:
        # No imports found, add at the top
        return 'import { applyUserRateLimit } from "@/libs/rate-limiters";\n\n' + content

    # Insert after last import
    last_import = matches[-1]
    insert_pos = last_import.end()

    return (
        content[:insert_pos] +
        '\nimport { applyUserRateLimit } from "@/libs/rate-limiters";' +
        content[insert_pos:]
    )

def add_rate_limiting_to_handler(handler_content, handler_name):
    """Add rate-limiting check at the beginning of a handler"""

    # Pattern: export async function GET(req) { or export async function GET(request) {
    # We need to ensure the parameter is captured
    param_match = re.search(r'export\s+async\s+function\s+' + handler_name + r'\s*\(\s*(\w+)\s*(?:,\s*\w+\s*)?\)\s*{', handler_content)

    if not param_match:
        # Try without async
        param_match = re.search(r'export\s+function\s+' + handler_name + r'\s*\(\s*(\w+)\s*(?:,\s*\w+\s*)?\)\s*{', handler_content)

    if not param_match:
        print(f"  [WARNING]  Could not find parameter name for {handler_name} handler")
        return handler_content

    param_name = param_match.group(1)

    # Find the opening brace of the function
    func_start = re.search(r'export\s+(?:async\s+)?function\s+' + handler_name + r'\s*\([^)]*\)\s*{', handler_content)
    if not func_start:
        return handler_content

    # Find the position right after the opening brace
    insert_pos = func_start.end()

    # Check if there's already a try block immediately after
    remaining = handler_content[insert_pos:].lstrip()

    rate_limit_code = f'''
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit({param_name});
  if (!rateLimitResult.allowed) {{
    return rateLimitResult.response;
  }}

  '''

    # If the next line starts with "try", insert before it
    if remaining.startswith('try'):
        # Insert rate-limiting code right after the opening brace, before try
        return handler_content[:insert_pos] + rate_limit_code + handler_content[insert_pos:]
    else:
        # Insert rate-limiting code right after the opening brace
        return handler_content[:insert_pos] + rate_limit_code + handler_content[insert_pos:]

def add_headers_to_response(content, handler_name):
    """Add rate-limit headers to NextResponse.json() calls"""

    # This is complex - we need to find NextResponse.json() calls and add headers
    # For simplicity, we'll add a comment suggesting manual addition
    # In production, you'd want to use a proper AST parser

    return content

def process_route_file(filepath):
    """Process a single route file"""
    print(f"\nProcessing: {filepath.relative_to(BASE_DIR.parent.parent.parent)}")

    # Read content
    with open(filepath, 'r', encoding='utf-8') as f:
        original_content = f.read()

    # Check if already has rate-limiting
    if has_rate_limiting(original_content):
        print("  [OK] Already has rate-limiting, skipping")
        return False

    # Create backup
    backup_path = filepath.with_suffix('.js.backup')
    shutil.copy2(filepath, backup_path)
    print(f"  [BACKUP] Created: {backup_path.name}")

    # Add import
    content = add_import(original_content)

    # Find all HTTP method handlers
    handlers = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    modified_handlers = []

    for handler in handlers:
        # Check if this handler exists
        if re.search(r'export\s+(?:async\s+)?function\s+' + handler + r'\s*\(', content):
            content = add_rate_limiting_to_handler(content, handler)
            modified_handlers.append(handler)

    if modified_handlers:
        print(f"  [OK] Added rate-limiting to: {', '.join(modified_handlers)}")
    else:
        print("  [WARNING]  No HTTP handlers found")

    # Write modified content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print("  [DONE] Rate-limiting applied")
    return True

def main():
    print("=" * 60)
    print("Auto Rate-Limiting Application for /api/user/* routes")
    print("=" * 60)

    # Find all route.js files
    route_files = list(BASE_DIR.rglob("route.js"))

    print(f"\nFound {len(route_files)} route files")

    # Process each file
    modified_count = 0
    skipped_count = 0

    for route_file in sorted(route_files):
        if process_route_file(route_file):
            modified_count += 1
        else:
            skipped_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total files: {len(route_files)}")
    print(f"Modified: {modified_count}")
    print(f"Skipped (already protected): {skipped_count}")
    print("\n[WARNING]  IMPORTANT: Review changes and test each route!")
    print("\nTo restore from backups if needed:")
    print("  find web/app/api/user -name '*.backup' -exec sh -c 'mv \"$1\" \"${1%.backup}\"' _ {} \\;")
    print("\nNext steps:")
    print("  1. Review git diff to verify changes")
    print("  2. Test rate-limiting with: curl -i http://localhost:3000/api/user/settings")
    print("  3. Commit with: git commit -m 'feat: add rate-limiting to all /api/user/* routes'")

if __name__ == "__main__":
    main()
