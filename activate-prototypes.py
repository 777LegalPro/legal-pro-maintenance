#!/usr/bin/env python3
"""Expose only the verified static prototype directory; keep site maintenance on.

Default: read-only preflight. --apply: back up, patch, validate, reload and verify.
The source is pinned in GitHub before transfer to the server.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile
import time

RELEASE = "r20261106-prototypes-01"
EXPECTED_CONFIG = "bddb50215a8401decb78c912b806895e881772aed73ff41e56a722ada394537b"
EXPECTED_MAINTENANCE = "bb045a3f40f08d8228cb83dece738bdff2e0f60eca492cb892ce4bcb92d441c7"
EXPECTED_FILES = {
    "prototypes/assets/index-CHh8SIBt.js": "250b0568a872205b417241fb487946f091c980f12d9288a8fa31a8296643cb91",
    "prototypes/assets/index-wweGKK84.css": "94ca2be428ffc6eeca865490fad51b1945e1450f16ee1c965e3006ac86bbe73e",
    "prototypes/administration/index.html": "2f5b733f927dc7f5dc64be9c833289b1791fab1d421858b4780c18f59693750e",
    "prototypes/central-court/index.html": "ac5da72485863e9aa1e02d545146173611e3fe4b9d8063271e2584fc38a3342f",
    "prototypes/duma/index.html": "ae72f89da9cfff6f4b003ad2b81900b8ec61c9a6d9b87592be9058233d4b9172",
    "prototypes/index.html": "0bf90f3b6f97023b02208e7f6366d06bba23e36cd01f911295451ea3a2fd9767",
    "prototypes/magistrate-2/index.html": "50b541dd847f762a15a625b84990d52e3c08aec06136c9b0c43c4f2cc33a2f66",
    "prototypes/vdpo/index.html": "299b6327cefcf2c975445e299b6bfb86170f6db15d3190efaaf039c3201aa735",
}
MARKER = "    # LEGAL-PRO-MAINTENANCE-BEGIN v1\n"
GUARD = "if (-f /var/www/legal-pro-maintenance/enabled) { return 503; }"


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run(args):
    result = subprocess.run(args, text=True, capture_output=True, timeout=30)
    require(result.returncode == 0, "Command failed: " + " ".join(args) + "\n" + result.stderr)
    return result.stdout


def patch_config(original, dist):
    text = original.decode("utf-8")
    require(text.count(MARKER) == 1, "Maintenance insertion marker is not unique")
    require(text.count(GUARD) == 1, "Expected maintenance guard is not unique")
    require("server_name prolg.ru www.prolg.ru;" in text, "Unexpected virtual host")
    require("LEGAL-PRO-PROTOTYPES-" not in text and not re.search(r"location[^\n]*\/prototypes", text), "Prototype route already configured")
    block = """    # LEGAL-PRO-PROTOTYPES-BEGIN v1
    location = /prototypes {
        return 308 /prototypes/;
    }
    location ^~ /prototypes/ {
        root DIST_PLACEHOLDER;
        index index.html;
        autoindex off;
        disable_symlinks on;
        charset utf-8;
        try_files $uri $uri/ =404;
        limit_except GET { deny all; }
    }
    # LEGAL-PRO-PROTOTYPES-END v1
""".replace("DIST_PLACEHOLDER", str(dist))
    candidate = text.replace(MARKER, block + MARKER, 1)
    require(candidate.replace(block, "", 1) == text, "Patch changed unrelated configuration")
    return candidate.encode("utf-8")


def atomic(path, data, original_stat):
    descriptor, temporary = tempfile.mkstemp(prefix=".prototypes-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fchmod(stream.fileno(), stat.S_IMODE(original_stat.st_mode))
            os.fchown(stream.fileno(), original_stat.st_uid, original_stat.st_gid)
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def http(path):
    descriptor, name = tempfile.mkstemp(prefix="prototypes-http-")
    os.close(descriptor)
    try:
        result = run(["curl", "--silent", "--show-error", "--max-time", "15", "--resolve", "prolg.ru:443:127.0.0.1", "--output", name, "--write-out", "%{http_code}\n%{content_type}", "https://prolg.ru" + path])
        status_code, _, content_type = result.partition("\n")
        return int(status_code), sha(Path(name).read_bytes()), content_type
    finally:
        os.unlink(name)


def verify_public():
    checked = []
    for relative, expected in EXPECTED_FILES.items():
        route = "/" + relative
        if route.endswith("index.html"):
            route = route[:-len("index.html")]
        status_code, digest, content_type = http(route)
        require(status_code == 200 and digest == expected, "Public prototype verification failed: " + route)
        expected_type = "text/html" if relative.endswith(".html") else "text/css" if relative.endswith(".css") else "javascript"
        require(expected_type in content_type, "Wrong content type: " + route)
        checked.append(route)
    require(http("/prototypes")[0] == 308, "Missing canonical redirect")
    require(http("/prototypes/not-a-real-page")[0] == 404, "Unexpected missing-page behavior")
    for route in ("/", "/thanks/"):
        status_code, digest, _ = http(route)
        require(status_code == 503 and digest == EXPECTED_MAINTENANCE, "Maintenance changed: " + route)
    return checked


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    require(os.geteuid() == 0, "Root is required for deployment preflight")
    config = Path("/etc/nginx/sites-enabled/prolg.ru.conf").resolve(strict=True)
    original = config.read_bytes()
    require(sha(original) == EXPECTED_CONFIG, "nginx config changed since inspection; do not overwrite")
    original_stat = config.stat()
    require(stat.S_ISREG(original_stat.st_mode) and original_stat.st_nlink == 1, "Unexpected config file type")
    deployment_config = json.loads(Path("/etc/legal-pro-deploy.json").read_text())
    dist = Path(deployment_config["dist"]).resolve(strict=True)
    require(re.fullmatch(r"/opt/legal-pro/releases/[A-Za-z0-9._-]+/dist", str(dist)) is not None, "Unexpected deployment root")
    require(Path("/opt/legal-pro/current/dist").resolve(strict=True) == dist, "Current release moved")
    state = json.loads(Path("/var/lib/legal-pro-deploy/state.json").read_text())
    require(state.get("release_id") == RELEASE and state.get("status") == "applied" and state.get("maintenance") is True and not state.get("last_error"), "Prototype release has not been successfully applied")
    maintenance_dir = Path("/var/www/legal-pro-maintenance")
    require((maintenance_dir / "enabled").is_file(), "Maintenance flag is missing")
    require(sha((maintenance_dir / "maintenance.html").read_bytes()) == EXPECTED_MAINTENANCE, "Maintenance HTML changed")
    actual_files = set()
    for path in (dist / "prototypes").rglob("*"):
        require(not path.is_symlink(), "Symlink in prototype directory")
        if path.is_file():
            require(path.stat().st_nlink == 1, "Hardlink in prototype directory")
            actual_files.add(path.relative_to(dist).as_posix())
    require(actual_files == set(EXPECTED_FILES), "Prototype directory contains missing or unexpected files")
    for relative, expected in EXPECTED_FILES.items():
        require(sha((dist / relative).read_bytes()) == expected, "File checksum mismatch: " + relative)
    homepage_hash = sha((dist / "index.html").read_bytes())
    candidate = patch_config(original, dist)
    run(["nginx", "-t"])
    for path in ("/", "/thanks/"):
        status_code, digest, _ = http(path)
        require(status_code == 503 and digest == EXPECTED_MAINTENANCE, "Existing maintenance response changed: " + path)
    print(json.dumps({"ready": True, "release": RELEASE, "files": len(EXPECTED_FILES), "dist": str(dist), "config": str(config), "config_sha256": EXPECTED_CONFIG, "maintenance": True}), flush=True)
    if not args.apply:
        print("READ-ONLY PREFLIGHT PASSED. Use --apply to activate only /prototypes/.")
        return
    backup_dir = Path(tempfile.mkdtemp(prefix="legal-pro-prototypes-", dir="/var/backups"))
    (backup_dir / "nginx.conf").write_bytes(original)
    (backup_dir / "metadata.json").write_text(json.dumps({"target": str(config), "before_sha256": sha(original), "after_sha256": sha(candidate), "release": RELEASE}, indent=2) + "\n")
    require(config.read_bytes() == original, "Concurrent config modification before activation")
    require(Path("/opt/legal-pro/current/dist").resolve(strict=True) == dist, "Concurrent release switch")
    atomic(config, candidate, original_stat)
    try:
        run(["nginx", "-t"])
        require(config.read_bytes() == candidate, "Concurrent config modification before reload")
        run(["systemctl", "reload", "nginx"])
        # A successful reload request can precede the new workers becoming ready.
        deadline = time.monotonic() + 20
        while True:
            try:
                checked = verify_public()
                break
            except RuntimeError:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(0.5)
        require(sha((dist / "index.html").read_bytes()) == homepage_hash, "Homepage file changed")
        require((maintenance_dir / "enabled").is_file(), "Maintenance flag removed")
        print(json.dumps({"activated": True, "verified_routes": checked, "maintenance": True, "backup": str(backup_dir), "config_sha256": sha(candidate)}), flush=True)
    except Exception:
        if config.read_bytes() == candidate:
            atomic(config, original, original_stat)
            run(["nginx", "-t"])
            run(["systemctl", "reload", "nginx"])
            print("ACTIVATION ROLLED BACK. Original nginx configuration restored.", flush=True)
        else:
            print("Concurrent change detected; not overwriting another change. Backup: " + str(backup_dir), flush=True)
        raise


if __name__ == "__main__":
    main()
