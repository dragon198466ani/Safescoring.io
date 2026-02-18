#!/usr/bin/env python3
"""
Import evaluations in chunks to avoid memory issues.
Reads JSON file progressively instead of loading all 790MB into memory.
"""
import sys
sys.path.insert(0, 'src')
import json
import requests
import time
from core.config import SUPABASE_URL, get_supabase_headers

headers = get_supabase_headers(prefer='resolution=merge-duplicates')

# Open and parse JSON file in chunks
print("Opening 790MB JSON file...")
with open('evaluations_detailed_backup.json', 'r', encoding='utf-8') as f:
    # Read opening bracket
    first_char = f.read(1)
    if first_char != '[':
        print(f"Error: Expected '[' but got '{first_char}'")
        sys.exit(1)

    print("File opened, starting import...")

    chunk = []
    chunk_size = 500
    total_imported = 0
    total_errors = 0

    buffer = ""
    bracket_count = 0
    in_string = False
    escape_next = False
    current_object = ""

    while True:
        # Read in 10KB chunks
        data = f.read(10240)
        if not data:
            break

        buffer += data

        # Process buffer character by character to find complete JSON objects
        i = 0
        while i < len(buffer):
            char = buffer[i]

            # Track if we're in a string
            if char == '"' and not escape_next:
                in_string = not in_string

            # Track escape sequences
            if char == '\\' and not escape_next:
                escape_next = True
            else:
                escape_next = False

            # Track brackets only outside strings
            if not in_string:
                if char == '{':
                    bracket_count += 1
                elif char == '}':
                    bracket_count -= 1

                    # Complete object found
                    if bracket_count == 0:
                        current_object += buffer[:i+1]
                        try:
                            obj = json.loads(current_object.strip().rstrip(','))
                            chunk.append(obj)

                            # Import when chunk is full
                            if len(chunk) >= chunk_size:
                                try:
                                    r = requests.post(
                                        f'{SUPABASE_URL}/rest/v1/evaluations',
                                        json=chunk,
                                        headers=headers,
                                        timeout=30
                                    )
                                    if r.status_code in [200, 201]:
                                        total_imported += len(chunk)
                                        if total_imported % 10000 == 0:
                                            print(f'Imported: {total_imported:,}', flush=True)
                                    else:
                                        total_errors += 1
                                        if total_errors <= 5:
                                            print(f'Error: {r.status_code} - {r.text[:200]}', flush=True)
                                except Exception as e:
                                    total_errors += 1
                                    if total_errors <= 5:
                                        print(f'Exception: {str(e)[:200]}', flush=True)

                                chunk = []
                                time.sleep(0.005)
                        except json.JSONDecodeError:
                            pass

                        current_object = ""
                        buffer = buffer[i+1:]
                        i = 0
                        continue

            current_object += char
            i += 1

        # Keep unprocessed data in buffer
        buffer = buffer[i:]

    # Import remaining chunk
    if chunk:
        try:
            r = requests.post(
                f'{SUPABASE_URL}/rest/v1/evaluations',
                json=chunk,
                headers=headers,
                timeout=30
            )
            if r.status_code in [200, 201]:
                total_imported += len(chunk)
        except Exception as e:
            total_errors += 1

print(f"\nImport complete!")
print(f"Total imported: {total_imported:,}")
print(f"Total errors: {total_errors}")
