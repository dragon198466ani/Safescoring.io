import json
import os

with open(r'c:\Users\alexa\Desktop\SafeScoring\data\all_norms_clean.json', 'r', encoding='utf-8') as f:
    norms = json.load(f)

# Generate SQL batches of 100 norms each
batch_size = 100
output_dir = r'c:\Users\alexa\Desktop\SafeScoring\data\sql_batches'
os.makedirs(output_dir, exist_ok=True)

for batch_num in range(0, len(norms), batch_size):
    batch = norms[batch_num:batch_num + batch_size]
    values = []
    
    for n in batch:
        link = f"'{n['link']}'" if n['link'] else 'NULL'
        access = f"'{n['access']}'" if n['access'] else 'NULL'
        source = f"'{n['source']}'" if n['source'] else 'NULL'
        values.append(f"('{n['code']}', '{n['pillar']}', '{n['title']}', '{n['description']}', {link}, {access}, {source}, FALSE, TRUE, TRUE)")
    
    sql = f'''INSERT INTO norms (code, pillar, title, description, official_link, access_type, issuing_authority, is_essential, consumer, "full")
VALUES
{",".join(values)}
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  official_link = COALESCE(EXCLUDED.official_link, norms.official_link),
  access_type = COALESCE(EXCLUDED.access_type, norms.access_type),
  issuing_authority = COALESCE(EXCLUDED.issuing_authority, norms.issuing_authority);'''
    
    filename = os.path.join(output_dir, f'batch_{batch_num//batch_size:02d}.sql')
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(sql)

print(f'Generated {(len(norms) + batch_size - 1) // batch_size} SQL batch files in {output_dir}')
