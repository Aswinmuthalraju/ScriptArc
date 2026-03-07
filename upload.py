#!/usr/bin/env python3
"""
Upload HLS course content to Bunny CDN storage zone via HTTPS.
Uses MSYS2 Python3 (OpenSSL) to bypass Windows Schannel TLS issues.
"""

import os
import ssl
import urllib.request
import concurrent.futures
import time

STORAGE_ZONE = 'scriptarc-course'
STORAGE_HOST = 'sg.storage.bunnycdn.com'
ACCESS_KEY   = '7b6f1e91-ca6d-4dc3-8711e55d78a0-d54d-4707'

BASE_DIR = r'C:\Users\Aswin\Documents\Code\Dev\ScriptArc\ScriptArc_V1\frontend\public\Course\Data Science'

# TLS context — disable cert verification (Windows Schannel compat via OpenSSL)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def upload_file(local_path: str, remote_path: str, retries: int = 4) -> bool:
    """Upload a single file. Returns True on success."""
    from urllib.parse import quote
    url = f'https://{STORAGE_HOST}/{STORAGE_ZONE}/{quote(remote_path)}'

    with open(local_path, 'rb') as f:
        data = f.read()

    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, data=data, method='PUT')
            req.add_header('AccessKey', ACCESS_KEY)
            req.add_header('Content-Type', 'application/octet-stream')
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                if resp.status in (200, 201):
                    return True
                print(f'  HTTP {resp.status} for {remote_path}')
                return False
        except Exception as e:
            if attempt == retries:
                print(f'  FAIL ({attempt}/{retries}): {remote_path} — {e}')
                return False
            time.sleep(1.5 * attempt)
    return False


def collect_files(unit_name: str):
    """Return list of (local_path, remote_path) for all .m3u8 and .ts files in a unit."""
    unit_dir = os.path.join(BASE_DIR, unit_name)
    queue = []
    for lecture in sorted(os.listdir(unit_dir)):
        lecture_dir = os.path.join(unit_dir, lecture)
        if not os.path.isdir(lecture_dir) or not lecture.startswith('lecture'):
            continue
        for fname in os.listdir(lecture_dir):
            if fname.endswith('.m3u8') or fname.endswith('.ts'):
                local  = os.path.join(lecture_dir, fname)
                remote = f'Course/Data Science/{unit_name}/{lecture}/{fname}'
                queue.append((local, remote))
    return queue


def upload_unit(unit_name: str, concurrency: int = 8):
    queue = collect_files(unit_name)
    print(f'{unit_name}: {len(queue)} files to upload')

    ok = err = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as ex:
        futures = {ex.submit(upload_file, lp, rp): rp for lp, rp in queue}
        for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
            if future.result():
                ok += 1
            else:
                err += 1
            if i % 100 == 0 or i == len(queue):
                print(f'  {unit_name}: {ok} ok, {err} errors ({len(queue)-i} remaining)')

    print(f'{unit_name} complete: {ok} uploaded, {err} failed\n')


if __name__ == '__main__':
    print('=== Bunny CDN Upload ===')
    print(f'Zone: {STORAGE_ZONE} | Host: {STORAGE_HOST}\n')
    upload_unit('Unit1')
    upload_unit('Unit2')
    print('=== All done! ===')
