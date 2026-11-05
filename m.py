#!/usr/bin/env python3
"""Add only a reversible maintenance banner. Stdlib; dry-run unless --apply.

Enable:   python3 enable_banner.py --apply
Rollback: python3 enable_banner.py --rollback /var/backups/.../manifest.json --apply
Local QA: supply --dist /path/to/copied/dist --backup-root /path/outside/dist.
"""
import argparse
import base64
import datetime as dt
import fcntl
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import shutil
import stat
import sys
import tempfile

TOOL = "legal-pro-maintenance-banner-v1"
PREFIX = "<!-- legal-pro-maintenance:"
STYLE = '''<!-- legal-pro-maintenance:style:begin -->
<style id="lp-maintenance-style">
#lp-maintenance-banner{box-sizing:border-box;display:block;position:relative;margin:0;padding:0;background:#f3f1eb;color:#101516;border-bottom:1px solid #c6c6bf;font-family:inherit;font-size:14px;line-height:1.5}
#lp-maintenance-banner *{box-sizing:border-box}
#lp-maintenance-banner .lp-maintenance-inner{width:100%;max-width:1280px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:5px 18px;text-align:center}
#lp-maintenance-banner strong{display:block;font-size:15px;line-height:1.4;font-weight:700;letter-spacing:.015em;color:#101516}
#lp-maintenance-banner p{margin:0;padding:0;font-size:14px;line-height:1.5;color:#101516}
#lp-maintenance-banner a{color:#101516;font-weight:600;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
#lp-maintenance-banner a:focus-visible{outline:2px solid #101516;outline-offset:4px;border-radius:2px}
@media(max-width:600px){#lp-maintenance-banner .lp-maintenance-inner{padding:13px 16px;display:block}#lp-maintenance-banner strong{margin-bottom:5px}#lp-maintenance-banner p{max-width:440px;margin:0 auto}}
</style>
<!-- legal-pro-maintenance:style:end -->'''
BANNER = '''<!-- legal-pro-maintenance:body:begin -->
<aside id="lp-maintenance-banner" role="note" aria-labelledby="lp-maintenance-title"><div class="lp-maintenance-inner"><strong id="lp-maintenance-title">Технические работы</strong><p>Мы обновляем сайт. По вопросам бесплатной юридической помощи: <a href="mailto:777@prolg.ru">777@prolg.ru</a></p></div></aside>
<!-- legal-pro-maintenance:body:end -->'''


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


class Positions(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.lines = [0] + [i + 1 for i, ch in enumerate(text) if ch == "\n"]
        self.head_end, self.body_start = [], []
        self.feed(text)
        self.close()

    def char_pos(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def handle_starttag(self, tag, attrs):
        if tag == "body":
            self.body_start.append(self.char_pos() + len(self.get_starttag_text()))

    def handle_endtag(self, tag):
        if tag == "head":
            self.head_end.append(self.char_pos())


def transform(data):
    text = data.decode("utf-8")
    if PREFIX in text or 'id="lp-maintenance-' in text:
        require(text.count(STYLE) == text.count(BANNER) == 1 and text.count(PREFIX) == 4,
                "Partial or different maintenance banner: refusing to overwrite it")
        return data
    positions = Positions(text)
    if not positions.head_end and not positions.body_start:
        return None  # HTML fragment, not a public document.
    require(len(positions.head_end) == len(positions.body_start) == 1,
            "Expected one closing head and one opening body")
    h, b = positions.head_end[0], positions.body_start[0]
    require(h < b, "Unexpected document structure")
    updated = text[:h] + STYLE + text[h:b] + BANNER + text[b:]
    require(updated.replace(STYLE, "", 1).replace(BANNER, "", 1) == text,
            "Original HTML preservation check failed")
    return updated.encode("utf-8")


def target(root, relative):
    parts = Path(relative).parts
    require(parts and not Path(relative).is_absolute() and
            all(p not in (".", "..") and not p.startswith(".") and p.lower() != "admin" for p in parts),
            "Unsafe or administrative path: " + relative)
    path = root
    for part in parts:
        path /= part
        require(not path.is_symlink(), "Symlink refused: " + relative)
    info = path.stat()
    require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, "Not a single regular file: " + relative)
    return path


def read_stable(path):
    before = path.stat()
    require(before.st_size <= 8 * 1024 * 1024, "HTML larger than 8 MiB: " + str(path))
    data = path.read_bytes()
    after = path.stat()
    signature = lambda s: (s.st_ino, s.st_dev, s.st_size, s.st_mtime_ns, s.st_ctime_ns)
    require(signature(before) == signature(after), "File changed while reading: " + str(path))
    return data, before


def iter_pages(root):
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if not d.startswith(".") and d.lower() != "admin"
                         and not (Path(directory) / d).is_symlink())
        for name in sorted(files):
            path = Path(directory) / name
            if path.suffix.lower() in (".html", ".htm") and not name.startswith(".") and not path.is_symlink():
                yield path.relative_to(root).as_posix()


def metadata(info, path):
    return {"mode": stat.S_IMODE(info.st_mode), "uid": info.st_uid, "gid": info.st_gid,
            "mtime_ns": info.st_mtime_ns, "atime_ns": info.st_atime_ns,
            "xattrs": {n: base64.b64encode(os.getxattr(path, n)).decode("ascii") for n in os.listxattr(path)}}


def atomic_write(path, data, meta=None, restore_time=False):
    fd, name = tempfile.mkstemp(prefix=".lp-maintenance-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            if meta:
                os.fchown(stream.fileno(), meta["uid"], meta["gid"])
                for attr in os.listxattr(stream.fileno()):
                    if attr not in meta["xattrs"]:
                        os.removexattr(stream.fileno(), attr)
                for attr, value in meta["xattrs"].items():
                    os.setxattr(stream.fileno(), attr, base64.b64decode(value))
                os.fchmod(stream.fileno(), meta["mode"])
                if restore_time:
                    os.utime(stream.fileno(), ns=(meta["atime_ns"], meta["mtime_ns"]))
            os.fsync(stream.fileno())
        os.replace(name, path)
        directory_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def write_manifest(path, document):
    atomic_write(path, (json.dumps(document, ensure_ascii=False, indent=2) + "\n").encode())


def summary(label, entries, extra=""):
    old = sum(e["bytes_before"] for e in entries)
    new = sum(e["bytes_after"] for e in entries)
    print(f"{label}: {len(entries)} files; before {old:,} bytes; after {new:,} bytes. {extra}")
    for item in entries[:10]:
        print("  " + item["path"])
    if len(entries) > 10:
        print(f"  ... and {len(entries) - 10} more")


def enough_space(path, needed):
    probe = path
    while not probe.exists():
        probe = probe.parent
    free = shutil.disk_usage(probe).free
    require(free >= needed, f"Insufficient space at {path}: need {needed:,}, free {free:,} bytes")
    return probe.stat().st_dev


def enable(args, root):
    entries, already, fragments = [], 0, 0
    for relative in iter_pages(root):
        path = target(root, relative)
        data, info = read_stable(path)
        try:
            new = transform(data)
        except Exception as error:
            raise RuntimeError(relative + ": " + str(error)) from error
        if new is None:
            fragments += 1
        elif new == data:
            already += 1
        else:
            entries.append({"path": relative, "sha256_before": sha(data), "sha256_after": sha(new),
                            "bytes_before": len(data), "bytes_after": len(new), "meta": metadata(info, path)})
    summary("APPLY PLAN" if args.apply else "DRY RUN", entries,
            f"Already present: {already}; fragments skipped: {fragments}; admin excluded.")
    if not args.apply or not entries:
        return
    backup_root = Path(args.backup_root).expanduser().resolve()
    require(backup_root != root and root not in backup_root.parents, "Backups must be outside public dist")
    total = sum(e["bytes_before"] for e in entries)
    growth = sum(max(0, e["bytes_after"] - e["bytes_before"]) for e in entries)
    reserve = max(16 * 1024 * 1024, total // 20)
    largest = max(e["bytes_after"] for e in entries)
    backup_needed = total + len(entries) * 8192 + reserve
    backup_device = enough_space(backup_root, backup_needed)
    if backup_device == root.stat().st_dev:
        enough_space(root, backup_needed + growth + largest)
    else:
        enough_space(root, growth + len(entries) * 4096 + largest + reserve)
    backup_root.mkdir(parents=True, exist_ok=True, mode=0o700)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path(tempfile.mkdtemp(prefix="banner-" + stamp + "-", dir=backup_root))
    manifest = backup / "manifest.json"
    doc = {"tool": TOOL, "state": "preparing", "dist": str(root), "created_utc": stamp, "files": entries}
    for entry in entries:
        path = target(root, entry["path"])
        data, _ = read_stable(path)
        require(sha(data) == entry["sha256_before"], "Concurrent edit before backup: " + entry["path"])
        saved = backup / "original" / entry["path"]
        saved.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with saved.open("xb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        saved.chmod(0o600)
        require(sha(saved.read_bytes()) == entry["sha256_before"], "Backup verification failed")
    doc["state"] = "prepared"
    write_manifest(manifest, doc)
    print("BACKUP MANIFEST: " + str(manifest), flush=True)
    try:
        for entry in entries:
            require(Path(args.dist).expanduser().resolve() == root, "Release pointer changed")
            path = target(root, entry["path"])
            data, _ = read_stable(path)
            require(sha(data) == entry["sha256_before"], "Concurrent edit: " + entry["path"])
            new = transform(data)
            require(sha(new) == entry["sha256_after"], "Unexpected generated content")
            atomic_write(path, new, entry["meta"])
        doc["state"] = "applied"
        write_manifest(manifest, doc)
        print(f"APPLIED: {len(entries)} pages. Restart is not required for static HTML.")
    except BaseException:
        doc["state"] = "interrupted; rollback available"
        write_manifest(manifest, doc)
        print("APPLY INTERRUPTED. Use --rollback " + str(manifest) + " --apply", file=sys.stderr)
        raise


def rollback(args, root):
    manifest = Path(args.rollback).expanduser().resolve(strict=True)
    require(root not in manifest.parents, "Manifest must be outside public dist")
    doc = json.loads(manifest.read_text(encoding="utf-8"))
    require(doc.get("tool") == TOOL and doc.get("dist") == str(root), "Manifest does not match this dist")
    pending, seen = [], set()
    for entry in doc["files"]:
        require(entry["path"] not in seen, "Duplicate manifest path")
        seen.add(entry["path"])
        path = target(root, entry["path"])
        saved = target(manifest.parent / "original", entry["path"])
        require(sha(saved.read_bytes()) == entry["sha256_before"], "Backup hash mismatch: " + entry["path"])
        current, _ = read_stable(path)
        digest = sha(current)
        require(digest in (entry["sha256_before"], entry["sha256_after"]),
                "Page edited since banner application; refusing rollback: " + entry["path"])
        if digest == entry["sha256_after"]:
            pending.append(entry)
    summary("ROLLBACK PLAN" if args.apply else "ROLLBACK DRY RUN", pending)
    if not args.apply or not pending:
        return
    enough_space(root, max(e["bytes_before"] for e in pending) + 16 * 1024 * 1024)
    for entry in pending:
        require(Path(args.dist).expanduser().resolve() == root, "Release pointer changed")
        path = target(root, entry["path"])
        current, _ = read_stable(path)
        require(sha(current) == entry["sha256_after"], "Concurrent edit during rollback: " + entry["path"])
        saved = target(manifest.parent / "original", entry["path"]).read_bytes()
        require(sha(saved) == entry["sha256_before"], "Backup changed during rollback")
        atomic_write(path, saved, entry["meta"], restore_time=True)
    doc["state"] = "rolled_back"
    write_manifest(manifest, doc)
    print(f"ROLLED BACK: {len(pending)} pages; original bytes restored.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", default="/opt/legal-pro/current/dist")
    parser.add_argument("--backup-root", default="/var/backups/legal-pro-maintenance")
    parser.add_argument("--rollback", metavar="MANIFEST_JSON")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Actually write changes; otherwise dry-run")
    mode.add_argument("--check", action="store_true", help="Explicit dry-run (the default)")
    args = parser.parse_args()
    root = Path(args.dist).expanduser().resolve(strict=True)
    require(root.is_dir(), "dist must be an existing directory")
    lock = os.open(root, os.O_RDONLY | os.O_DIRECTORY)
    try:
        fcntl.flock(lock, (fcntl.LOCK_EX if args.apply else fcntl.LOCK_SH) | fcntl.LOCK_NB)
        (rollback if args.rollback else enable)(args, root)
    finally:
        os.close(lock)


if __name__ == "__main__":
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print("ERROR: " + str(error), file=sys.stderr)
        sys.exit(1)
