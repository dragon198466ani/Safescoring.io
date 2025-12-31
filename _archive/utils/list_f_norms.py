import requests
import sys
h={'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZG5jdHRvbWRxb2psb3p4anh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjMwNzUsImV4cCI6MjA3OTk5OTA3NX0.tTgqj-ALcl0oIdxFHuFQkB19apiz9CSyvV2X1TMWjEk'}
pillar = sys.argv[1] if len(sys.argv) > 1 else 'S'
r=requests.get(f'https://ajdncttomdqojlozxjxu.supabase.co/rest/v1/norms?select=code,title&pillar=eq.{pillar}&order=code', headers=h)
for n in r.json():
    print(f"{n['code']}: {n['title']}")
