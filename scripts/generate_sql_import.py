#!/usr/bin/env python3
"""
Generate SQL files for importing evaluations via Supabase SQL Editor.
The SQL Editor has a longer timeout than the REST API.
"""
import sys
sys.path.insert(0, 'src')
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')

import json

def escape_sql(s):
    """Escape single quotes for SQL."""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def main():
    print("Loading evaluations...")
    with open('data/claude_opus_evaluations.json', 'r') as f:
        evaluations = json.load(f)

    total = len(evaluations)
    print(f"Total: {total} evaluations")

    # Generate SQL files in chunks of 1000
    chunk_size = 1000
    output_dir = 'data/sql_import'
    os.makedirs(output_dir, exist_ok=True)

    print(f"Generating SQL files (chunk_size={chunk_size})...")

    for i in range(0, total, chunk_size):
        chunk = evaluations[i:i + chunk_size]
        file_num = i // chunk_size

        with open(f'{output_dir}/import_{file_num:05d}.sql', 'w', encoding='utf-8') as f:
            f.write(f"-- Batch {file_num}: evaluations {i} to {i + len(chunk) - 1}\n")
            f.write("-- Run in Supabase SQL Editor\n\n")

            f.write("INSERT INTO evaluations (product_id, norm_id, result, why_this_result, evaluated_by, evaluation_date, confidence_score)\n")
            f.write("VALUES\n")

            values = []
            for ev in chunk:
                v = f"({ev['product_id']}, {ev['norm_id']}, {escape_sql(ev['result'])}, "
                v += f"{escape_sql(ev['why_this_result'][:500])}, {escape_sql(ev['evaluated_by'])}, "
                v += f"{escape_sql(ev['evaluation_date'])}, {ev['confidence_score']})"
                values.append(v)

            f.write(',\n'.join(values))
            f.write("\nON CONFLICT (product_id, norm_id, evaluation_date) DO UPDATE SET\n")
            f.write("  result = EXCLUDED.result,\n")
            f.write("  why_this_result = EXCLUDED.why_this_result,\n")
            f.write("  evaluated_by = EXCLUDED.evaluated_by,\n")
            f.write("  confidence_score = EXCLUDED.confidence_score;\n")

        if (file_num + 1) % 100 == 0:
            print(f"  Generated {file_num + 1} files...")

    num_files = (total + chunk_size - 1) // chunk_size
    print(f"\nGenerated {num_files} SQL files in {output_dir}/")
    print("\nTo import:")
    print("1. Go to Supabase Dashboard > SQL Editor")
    print("2. Run: SET statement_timeout = '300s';")
    print("3. Copy/paste and run each SQL file")
    print("   OR use psql: psql -f import_00000.sql")

if __name__ == "__main__":
    main()
