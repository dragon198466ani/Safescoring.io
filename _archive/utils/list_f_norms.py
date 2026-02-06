import requests
import sys
h={'apikey': 'REVOKED_ROTATE_ON_DASHBOARD'}
pillar = sys.argv[1] if len(sys.argv) > 1 else 'S'
r=requests.get(f'https://ajdncttomdqojlozxjxu.supabase.co/rest/v1/norms?select=code,title&pillar=eq.{pillar}&order=code', headers=h)
for n in r.json():
    print(f"{n['code']}: {n['title']}")
