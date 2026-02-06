import requests
import sys

SUPABASE_URL = 'https://ajdncttomdqojlozxjxu.supabase.co'
SUPABASE_KEY = 'REVOKED_ROTATE_ON_DASHBOARD'

type_id = int(sys.argv[1]) if len(sys.argv) > 1 else 45

h = {'apikey': SUPABASE_KEY}
r = requests.get(f'{SUPABASE_URL}/rest/v1/product_types?id=eq.{type_id}&select=*', headers=h)
t = r.json()[0]

print(f"{'='*60}")
print(f"Type: {t['name']} ({t['code']})")
print(f"{'='*60}")
print(f"\nDescription:\n{t.get('description', 'N/A')}")
print(f"\nExemples:\n{t.get('examples', 'N/A')}")
print(f"\nAvantages:\n{t.get('advantages', 'N/A')}")
print(f"\nInconvénients:\n{t.get('disadvantages', 'N/A')}")
