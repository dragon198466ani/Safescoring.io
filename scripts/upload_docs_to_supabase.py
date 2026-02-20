#!/usr/bin/env python3
"""
Upload norm documents to Supabase Storage for cloud backup.
"""
import os
import sys
import time
import requests
import mimetypes

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.core.config import SUPABASE_URL, SUPABASE_KEY

BUCKET_NAME = "norme"
NORM_DOCS_DIR = "norm_docs"
NORM_PDFS_DIR = "norm_pdfs"


def get_storage_headers(content_type=None):
    """Get headers for Supabase Storage API."""
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    if content_type:
        headers['Content-Type'] = content_type
    return headers


def create_bucket_if_not_exists():
    """Create the storage bucket if it doesn't exist."""
    url = f'{SUPABASE_URL}/storage/v1/bucket'
    headers = get_storage_headers('application/json')

    # Check if bucket exists
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        buckets = r.json()
        if any(b['name'] == BUCKET_NAME for b in buckets):
            print(f"Bucket '{BUCKET_NAME}' already exists")
            return True

    # Create bucket
    data = {
        'id': BUCKET_NAME,
        'name': BUCKET_NAME,
        'public': False
    }
    r = requests.post(url, headers=headers, json=data)
    if r.status_code in [200, 201]:
        print(f"Created bucket '{BUCKET_NAME}'")
        return True
    else:
        print(f"Failed to create bucket: {r.status_code} - {r.text}")
        return False


def upload_file(local_path, remote_path, retries=3):
    """Upload a file to Supabase Storage with retry logic."""
    content_type, _ = mimetypes.guess_type(local_path)
    if not content_type:
        content_type = 'application/octet-stream'

    url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{remote_path}'
    headers = get_storage_headers(content_type)

    with open(local_path, 'rb') as f:
        data = f.read()

    for attempt in range(retries):
        try:
            r = requests.post(url, headers=headers, data=data, timeout=30)
            if r.status_code in [200, 201]:
                return True
            elif r.status_code == 400 and 'already exists' in r.text.lower():
                # Try to update instead
                r = requests.put(url, headers=headers, data=data, timeout=30)
                return r.status_code in [200, 201]
            elif r.status_code == 400 and 'Duplicate' in r.text:
                return True  # Already uploaded
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            return False
    return False


def main():
    print("=" * 60)
    print("UPLOADING DOCUMENTS TO SUPABASE STORAGE")
    print("=" * 60)

    # Bucket already created manually in Supabase Dashboard
    print(f"Using bucket: {BUCKET_NAME}")

    uploaded = 0
    failed = 0

    # Upload HTML files
    if os.path.exists(NORM_DOCS_DIR):
        html_files = [f for f in os.listdir(NORM_DOCS_DIR) if f.endswith('.html')]
        print(f"\nUploading {len(html_files)} HTML files...")

        for i, filename in enumerate(html_files):
            local_path = os.path.join(NORM_DOCS_DIR, filename)
            remote_path = f"html/{filename}"

            if upload_file(local_path, remote_path):
                uploaded += 1
                if uploaded % 100 == 0:
                    print(f"  Progress: {uploaded} uploaded")
            else:
                failed += 1
            time.sleep(0.15)  # Rate limiting delay

    # Upload PDF files
    if os.path.exists(NORM_PDFS_DIR):
        pdf_files = [f for f in os.listdir(NORM_PDFS_DIR) if f.endswith('.pdf')]
        print(f"\nUploading {len(pdf_files)} PDF files...")

        for filename in pdf_files:
            local_path = os.path.join(NORM_PDFS_DIR, filename)
            remote_path = f"pdf/{filename}"

            if upload_file(local_path, remote_path):
                uploaded += 1
                print(f"  [OK] {filename}")
            else:
                failed += 1
                print(f"  [FAIL] {filename}")
            time.sleep(0.15)  # Rate limiting delay

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"Uploaded: {uploaded}")
    print(f"Failed: {failed}")
    print(f"\nFiles available at: {SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/")


if __name__ == '__main__':
    main()
