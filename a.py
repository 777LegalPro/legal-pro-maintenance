#!/usr/bin/env python3
"""Expose only the original public design assets needed by the maintenance page."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import time

MARK = '# LEGAL-PRO-MAINTENANCE-ASSETS-BEGIN v1'
END = '# LEGAL-PRO-MAINTENANCE-ASSETS-END v1'
ANCHOR = '# LEGAL-PRO-MAINTENANCE-BEGIN v1'
ASSETS = {
    '/assets/site.css': 'text/css',
    '/assets/Montserrat.woff': 'font/woff',
    '/assets/Montserrat.ttf': 'font/ttf',
    '/assets/tyumen-illustration.webp': 'image/webp',
    '/assets/tyumen-illustration-mobile.webp': 'image/webp',
    '/assets/tyumen-illustration.png': 'image/png',
}

def require(ok, message):
    if not ok:
        raise RuntimeError(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def run(argv, check=True, timeout=30):
    r = subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if check and r.returncode:
        raise RuntimeError(' '.join(argv[:3]) + ': ' + r.stderr.decode(errors='replace')[-1200:])
    return r

def atomic(path, data, mode, uid, gid):
    fd, name = tempfile.mkstemp(prefix='.lp-assets-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            os.fchmod(stream.fileno(), mode)
            os.fchown(stream.fileno(), uid, gid)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
        fd = os.open(path.parent, os.O_DIRECTORY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    finally:
        if os.path.exists(name):
            os.unlink(name)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    require(os.geteuid() == 0, 'Root is required')
    config = Path('/etc/nginx/sites-enabled/prolg.ru.conf').resolve(strict=True)
    require(config == Path('/etc/nginx/sites-available/prolg.ru.conf'), 'Unexpected nginx file')
    dist = Path('/opt/legal-pro/current/dist').resolve(strict=True)
    require(dist.is_relative_to('/opt/legal-pro/releases') and dist.name == 'dist', 'Unexpected public root')
    require(not any(c.isspace() for c in str(dist)), 'Whitespace in public root')
    original = config.read_bytes()
    info = config.stat()
    text = original.decode('utf-8')
    require(text.count(ANCHOR) == text.count('# LEGAL-PRO-MAINTENANCE-GUARD v1') == 1,
            'Expected current fullscreen maintenance configuration')
    require('server_name prolg.ru www.prolg.ru;' in text and 'listen 443' in text, 'Unexpected HTTPS server')
    require(Path('/var/www/legal-pro-maintenance/enabled').is_file(), 'Maintenance must remain enabled')
    page = Path('/var/www/legal-pro-maintenance/maintenance.html').read_bytes()
    hashes, blocks = {}, [MARK]
    for uri, mime in ASSETS.items():
        path = dist / uri.lstrip('/')
        require(path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(dist / 'assets'),
                'Missing or unsafe original asset: ' + uri)
        require(path.stat().st_size <= 16 * 1024 * 1024, 'Oversized original asset: ' + uri)
        hashes[uri] = digest(path.read_bytes())
        blocks.append(f'''    location = {uri} {{
        alias {path};
        types {{ }}
        default_type {mime};
        open_file_cache off;
        add_header Cache-Control "public, max-age=3600" always;
        limit_except GET {{ deny all; }}
    }}''')
    blocks.append('    ' + END + '\n    ')
    block = '\n'.join(blocks)
    if MARK in text:
        require(text.count(block) == 1 and text.count(END) == 1, 'Different asset patch already exists')
        patched = original
    else:
        require(END not in text, 'Incomplete existing asset patch')
        patched = text.replace(ANCHOR, block + ANCHOR, 1).encode()
    run(['nginx', '-t'])
    print(json.dumps({'assets': hashes, 'config_sha256': digest(original)}, indent=2), flush=True)
    if not args.apply:
        print('DRY RUN: only six existing public design assets will become available. HTML routes remain HTTP 503.')
        return
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = Path(tempfile.mkdtemp(prefix='legal-pro-maintenance-assets-' + stamp + '-', dir='/var/backups'))
    atomic(backup / 'nginx.conf', original, 0o600, 0, 0)
    (backup / 'manifest.json').write_text(json.dumps({'config': str(config), 'original_sha256': digest(original),
        'mode': stat.S_IMODE(info.st_mode), 'uid': info.st_uid, 'gid': info.st_gid, 'assets': hashes}, indent=2))
    (backup / 'manifest.json').chmod(0o600)
    try:
        require(config.read_bytes() == original, 'Concurrent nginx edit detected')
        atomic(config, patched, stat.S_IMODE(info.st_mode), info.st_uid, info.st_gid)
        run(['nginx', '-t'])
        run(['systemctl', 'reload', 'nginx'])
        deadline = time.monotonic() + 10
        checks = [('/', '503', digest(page)), ('/thanks/', '503', digest(page))]
        checks += [(uri, '200', sha) for uri, sha in hashes.items()]
        for uri, expected_code, expected_sha in checks:
            while True:
                remaining = deadline - time.monotonic()
                require(remaining > .1, 'HTTP verification deadline: ' + uri)
                output = backup / 'check-body'
                output.unlink(missing_ok=True)
                response = run(['curl', '--silent', '--show-error', '--noproxy', '*', '--max-time',
                    f'{min(2, remaining - .05):.3f}', '--resolve', 'prolg.ru:443:127.0.0.1',
                    '--output', str(output), '--write-out', '%{http_code}', 'https://prolg.ru' + uri],
                    check=False, timeout=min(3, remaining))
                code = response.stdout.decode(errors='replace').strip()
                actual_sha = digest(output.read_bytes()) if output.exists() else None
                if response.returncode == 0 and code == expected_code and actual_sha == expected_sha:
                    break
                require(deadline - time.monotonic() > 1,
                    f'HTTP verification failed: {uri}; code={code}; sha={actual_sha}')
                time.sleep(1)
        print('VERIFIED: six original design assets HTTP 200; homepage and /thanks/ HTTP 503; backup=' + str(backup), flush=True)
    except BaseException:
        if config.read_bytes() == patched:
            atomic(config, original, stat.S_IMODE(info.st_mode), info.st_uid, info.st_gid)
            run(['nginx', '-t'])
            run(['systemctl', 'reload', 'nginx'])
            print('RESTORED: original nginx configuration; maintenance remains enabled', flush=True)
        else:
            print('Concurrent nginx change preserved; backup=' + str(backup), flush=True)
        raise

if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as exc:
        print('ERROR: ' + str(exc), flush=True)
        raise SystemExit(1)
