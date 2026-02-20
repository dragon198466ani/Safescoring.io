#!/usr/bin/env python3
"""Fix infrastructure types that have 0 norms"""
import re

# Read current mapping file
with open('c:/Users/alexa/Desktop/SafeScoring/src/core/norm_applicability_complete.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Types that need ALL norms (infrastructure/tools - they're not financial products but need basic norms)
INFRASTRUCTURE_TYPES = [
    'INFRASTRUCTURE', 'DEV_TOOLS', 'EXPLORER', 'NODE_RPC',
    'PROTOCOL', 'RESEARCH', 'SECURITY', 'STORAGE', 'TAX',
    'COMPUTE', 'DATA_INDEXER'
]

# Get all norm mappings
norm_pattern = r"'([A-Z0-9_-]+)': \[(.*?)\],"
matches = re.findall(norm_pattern, content)

updated_norms = []
for norm_code, types_str in matches:
    # Parse existing types
    types = set(re.findall(r"'(\w+)'", types_str))

    # Add infrastructure types to all norms
    # (These are service providers, they should be evaluated on all norms)
    types.update(INFRASTRUCTURE_TYPES)

    # Sort and format
    sorted_types = sorted(types)
    types_formatted = ', '.join([f"'{t}'" for t in sorted_types])
    updated_norms.append(f"    '{norm_code}': [{types_formatted}],")

# Rebuild NORM_APPLICABILITY section
norm_section = "NORM_APPLICABILITY = {\n" + "\n".join(updated_norms) + "\n}"

# Replace in content
content = re.sub(r"NORM_APPLICABILITY = \{.*?\}", norm_section, content, flags=re.DOTALL)

# Write updated file
with open('c:/Users/alexa/Desktop/SafeScoring/src/core/norm_applicability_complete.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Types infrastructure corriges!')
print(f'Types ajoutes a toutes les normes: {INFRASTRUCTURE_TYPES}')
