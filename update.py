#!/usr/bin/env python3
"""Reviewed public HTML update. Stdlib only. Default: read-only --check."""
import argparse, base64, datetime, fcntl, gzip, hashlib, html, json, os
import signal, stat, sys, tempfile
from html.parser import HTMLParser
from pathlib import Path

DATE = '2026-11-05'
DEFAULT_ROOT = Path('/opt/legal-pro/current')
RELEASE = Path('/opt/legal-pro/releases/20261021-0245')
PATHS = {'home':'dist/index.html', 'bio':'dist/artem-vintenko/index.html',
         'community':'dist/community/index.html', 'foundation':'dist/foundation/index.html',
         'volunteers':'dist/volunteers/index.html', 'search_team':'dist/search-team/index.html',
         'press':'dist/press/index.html', 'thanks':'dist/thanks/index.html'}
PAYLOAD_SHA256 = '52cd2a4f6d701690dc43ccc45f25bba50209bafdc6411ad2c636a93305216272'
PACKED = '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'

def require(ok, message):
    if not ok: raise RuntimeError(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

class Scan(HTMLParser):
    pairs = {'main','head','title','script','header','footer','h1'}
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source, self.tags, self.stack, self.lines = source, [], {}, [0]
        self.lines += [i+1 for i,c in enumerate(source) if c == '\n']
        self.feed(source); self.close()
        require(not any(self.stack.values()), 'Unclosed structural HTML tag')
    def position(self):
        line, column = self.getpos()
        return self.lines[line-1] + column
    def handle_starttag(self, tag, attrs):
        start = self.position()
        node = {'tag':tag, 'attrs':dict(attrs), 'start':start,
                'open_end':start+len(self.get_starttag_text())}
        self.tags.append(node)
        if tag in self.pairs: self.stack.setdefault(tag, []).append(node)
    def handle_endtag(self, tag):
        if tag not in self.pairs: return
        require(self.stack.get(tag), 'Unexpected closing tag: '+tag)
        node = self.stack[tag].pop()
        node['close_start'] = self.position()
        node['end'] = self.source.index('>', self.position()) + 1
    def select(self, tag):
        return [n for n in self.tags if n['tag'] == tag]
    def single(self, tag):
        found = self.select(tag)
        require(len(found) == 1, 'Expected one '+tag+', found '+str(len(found)))
        return found[0]

def main_check(source, key, spec):
    parser = Scan(source)
    node = parser.single('main'); parser.single('h1')
    require(not source[:node['start']].strip() and not source[node['end']:].strip(),
            key+': payload must contain only main')
    require(not any(parser.select(t) for t in ('head','header','footer','script','style')),
            key+': forbidden element in main payload')
    if key == 'thanks':
        cards = [n for n in parser.select('article') if 'recognition-card' in
                 (n['attrs'].get('class') or '').split()]
        require(len(cards) == spec['expected_cards'], 'Incorrect thanks card count')
        ids = {n['attrs'].get('id') for n in cards}
        require(len(ids) == len(cards) and None not in ids, 'Duplicate/missing thanks IDs')
        require({'thanks-pushkarev-vladimir-petrovich',
                 'thanks-morgacheva-evgeniya-aleksandrovna'} <= ids,
                'Existing thanks cards are missing')
    if key == 'home':
        require('community-home-teaser' not in source, 'Home project teaser remains')
        require('Все '+str(spec['expected_cards'])+' благодарностей' in html.unescape(source),
                'Home thanks link/count mismatch')
    if key == 'bio':
        for token in ('У025-00113-72/07420731','У024-00113-72/07504314',
                      '13.10.2026','16.10.2026','16.10.2027',
                      'https://ural-meridian.ru/news/194647/','https://tyumedia.ru/246901.html'):
            require(token in source, 'Missing protected biography fact/link: '+token)
    if key == 'search_team':
        for number in ('102','112'):
            require(any(n['attrs'].get('href') == 'tel:'+number for n in parser.select('a')),
                    'Emergency phone missing: '+number)

def render(data, key, spec):
    source = data.decode('utf-8')
    old = Scan(source)
    main, head, title = old.single('main'), old.single('head'), old.single('title')
    require(head['open_end'] <= title['start'] < title['end'] <= head['close_start'],
            key+': title outside head')
    main_check(spec['main_html'], key, spec)
    patches = [(main['start'],main['end'],spec['main_html']),
               (title['open_end'],title['close_start'],html.escape(spec['title']))]
    fields = {('name','description'):spec['description'],
              ('property','og:title'):spec['title'],
              ('property','og:description'):spec['description'],
              ('name','twitter:title'):spec['title'],
              ('name','twitter:description'):spec['description']}
    for (attribute, value), replacement in fields.items():
        found = [n for n in old.select('meta') if n['attrs'].get(attribute) == value]
        require(len(found) == 1, key+': missing/duplicate meta '+value)
        node = found[0]
        require(head['open_end'] <= node['start'] < node['open_end'] <= head['close_start'],
                key+': meta outside head')
        attrs = dict(node['attrs']); attrs['content'] = replacement
        tag = '<meta'+''.join(' '+k+'="'+html.escape(v or '',quote=True)+'"'
                             for k,v in attrs.items())+'>'
        patches.append((node['start'],node['open_end'],tag))
    changed = [0]
    def update_json(value):
        if isinstance(value, dict):
            kind = value.get('@type')
            if kind == 'WebPage' or isinstance(kind,list) and 'WebPage' in kind:
                require(value.get('url') == spec['url'], key+': WebPage URL mismatch')
                value.update(name=spec['name'], description=spec['description'], dateModified=DATE)
                changed[0] += 1
            for child in value.values(): update_json(child)
        elif isinstance(value,list):
            for child in value: update_json(child)
    for node in old.select('script'):
        if (node['attrs'].get('type') or '').lower() != 'application/ld+json': continue
        value = json.loads(source[node['open_end']:node['close_start']])
        before = changed[0]; update_json(value)
        if changed[0] != before:
            encoded = json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
            patches.append((node['open_end'],node['close_start'],encoded))
    require(changed[0] == 1, key+': expected one matching WebPage')
    patches.sort()
    require(all(a[1] <= b[0] for a,b in zip(patches,patches[1:])), 'Overlapping HTML patches')
    output = source
    for start,end,value in reversed(patches): output = output[:start]+value+output[end:]
    new = Scan(output); new.single('main'); new.single('title')
    for tag in ('header','footer'):
        require([source[n['start']:n['end']] for n in old.select(tag)] ==
                [output[n['start']:n['end']] for n in new.select(tag)], key+': '+tag+' changed')
    return output.encode('utf-8')

def xattrs(fd):
    return {name:os.getxattr(fd,name) for name in os.listxattr(fd)}

def target(root, relative):
    path = root
    for part in Path(relative).parts:
        require(part not in ('..','') and not Path(relative).is_absolute(), 'Unsafe relative path')
        path = path / part
        require(not path.is_symlink(), 'Symlink target/component: '+str(path))
    info = path.lstat()
    require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, 'Not a single regular file: '+str(path))
    return path

def snapshot(root, relative):
    path = target(root,relative)
    with os.fdopen(os.open(path,os.O_RDONLY|os.O_NOFOLLOW),'rb') as file:
        info = os.fstat(file.fileno())
        require(info.st_size <= 2000000, 'Unexpectedly large HTML: '+relative)
        data = file.read(); attrs = xattrs(file.fileno()); after = os.fstat(file.fileno())
    signature = lambda s:(s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns,s.st_uid,s.st_gid,s.st_mode)
    require(signature(info) == signature(after), 'Changed while reading: '+relative)
    return {'path':path,'relative':relative,'old':data,'old_sha':digest(data),'stat':info,
            'signature':signature(info),'attrs':attrs}

def unchanged(root, entry):
    current = snapshot(root,entry['relative'])
    require(current['signature'] == entry['signature'] and current['old_sha'] == entry['old_sha']
            and current['attrs'] == entry['attrs'], 'Concurrent change: '+entry['relative'])

def sync_dir(path):
    fd = os.open(path,os.O_RDONLY|os.O_DIRECTORY)
    try: os.fsync(fd)
    finally: os.close(fd)

def stage(entry, data, restore=False):
    fd, name = tempfile.mkstemp(prefix='.prolg-public-',suffix='.tmp',dir=entry['path'].parent)
    temporary = Path(name); info = entry['stat']
    try:
        with os.fdopen(fd,'wb') as file:
            file.write(data); file.flush()
            now = os.fstat(file.fileno())
            if (now.st_uid,now.st_gid) != (info.st_uid,info.st_gid):
                os.fchown(file.fileno(),info.st_uid,info.st_gid)
            for name in os.listxattr(file.fileno()):
                if name not in entry['attrs']: os.removexattr(file.fileno(),name)
            for name,value in entry['attrs'].items(): os.setxattr(file.fileno(),name,value)
            os.fchmod(file.fileno(),stat.S_IMODE(info.st_mode))
            if restore: os.utime(file.fileno(),ns=(info.st_atime_ns,info.st_mtime_ns))
            os.fsync(file.fileno()); now = os.fstat(file.fileno())
            require((now.st_uid,now.st_gid,stat.S_IMODE(now.st_mode)) ==
                    (info.st_uid,info.st_gid,stat.S_IMODE(info.st_mode)), 'Metadata preservation failed')
            require(xattrs(file.fileno()) == entry['attrs'], 'Extended attributes changed')
        require(digest(temporary.read_bytes()) == digest(data), 'Staged content hash mismatch')
        return temporary
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise

def manifest_write(directory, value):
    fd, name = tempfile.mkstemp(prefix='.manifest-',dir=directory)
    try:
        with os.fdopen(fd,'wb') as file:
            file.write((json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode())
            file.flush(); os.fsync(file.fileno())
        os.replace(name,directory/'manifest.json'); sync_dir(directory)
    finally:
        Path(name).unlink(missing_ok=True)

def apply_all(root, requested, backup_root, plan):
    changes = [entry for entry in plan if entry['old'] != entry['new']]
    if not changes:
        print('ALREADY CURRENT: no writes or backups needed'); return
    backup_root = backup_root.resolve(strict=True)
    require(backup_root != root and root not in backup_root.parents, 'Backup must be outside release')
    for entry in plan: unchanged(root,entry)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = Path(tempfile.mkdtemp(prefix='legal-pro-public-'+stamp+'-',dir=backup_root))
    document = {'status':'preparing','created_utc':stamp,'root':str(root),
                'requested_root':str(requested),'payload_sha256':PAYLOAD_SHA256,
                'dateModified':DATE,'attempted':[],'files':[]}
    staged, attempted = {}, []
    try:
        for entry in plan:
            destination = backup / entry['relative']
            destination.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
            with os.fdopen(os.open(destination,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'wb') as file:
                file.write(entry['old']); file.flush(); os.fsync(file.fileno())
            require(digest(destination.read_bytes()) == entry['old_sha'], 'Backup hash mismatch')
            sync_dir(destination.parent)
            info = entry['stat']
            document['files'].append({'path':entry['relative'],'sha256_before':entry['old_sha'],
                'sha256_after':entry['new_sha'],'bytes_before':len(entry['old']),
                'bytes_after':len(entry['new']),'mode':oct(stat.S_IMODE(info.st_mode)),
                'uid':info.st_uid,'gid':info.st_gid,'atime_ns':info.st_atime_ns,'mtime_ns':info.st_mtime_ns,
                'xattrs':{k:base64.b64encode(v).decode() for k,v in entry['attrs'].items()}})
        document['status'] = 'prepared'; manifest_write(backup,document)
        print('BACKUP: '+str(backup),flush=True)
        for entry in changes: staged[entry['relative']] = stage(entry,entry['new'])
        require(requested.resolve(strict=True) == root, 'Release pointer changed')
        for entry in plan: unchanged(root,entry)
        for entry in changes:
            require(requested.resolve(strict=True) == root, 'Release pointer changed')
            unchanged(root,entry)
            document['status'] = 'applying'; document['attempted'].append(entry['relative'])
            manifest_write(backup,document)
            attempted.append(entry)
            os.replace(staged[entry['relative']],entry['path']); sync_dir(entry['path'].parent)
            require(digest(entry['path'].read_bytes()) == entry['new_sha'], 'Applied hash mismatch')
        document['status'] = 'committed'; manifest_write(backup,document)
        print('APPLIED: '+str(len(changes))+' pages; backup '+str(backup))
    except BaseException as error:
        for sig in (signal.SIGINT,signal.SIGTERM): signal.signal(sig,signal.SIG_IGN)
        failures = []
        for entry in reversed(attempted):
            try:
                path = target(root,entry['relative']); actual = digest(path.read_bytes())
                if actual == entry['old_sha']: continue
                require(actual == entry['new_sha'], 'Unexpected concurrent content; refusing overwrite')
                temporary = stage(entry,entry['old'],restore=True)
                try: os.replace(temporary,path); sync_dir(path.parent)
                finally: temporary.unlink(missing_ok=True)
                require(digest(path.read_bytes()) == entry['old_sha'], 'Rollback hash mismatch')
            except BaseException as rollback_error:
                failures.append(entry['relative']+': '+str(rollback_error))
        document['status'] = 'rollback_incomplete' if failures else 'rolled_back'
        document['error'] = type(error).__name__+': '+str(error)
        document['rollback_errors'] = failures
        try: manifest_write(backup,document)
        except BaseException as journal_error: failures.append('manifest: '+str(journal_error))
        print('ROLLBACK '+('INCOMPLETE' if failures else 'OK')+'; backup '+str(backup),file=sys.stderr)
        for failure in failures: print(failure,file=sys.stderr)
        raise
    finally:
        for temporary in staged.values():
            try: temporary.unlink(missing_ok=True)
            except OSError: pass

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check',action='store_true',help='Validate without writing (default)')
    mode.add_argument('--apply',action='store_true',help='Back up and atomically replace reviewed pages')
    parser.add_argument('--root',type=Path,default=DEFAULT_ROOT,help='Release root containing dist/')
    parser.add_argument('--backup-root',type=Path,default=Path('/var/backups'),help='Existing backup parent')
    args = parser.parse_args(argv)
    raw = gzip.decompress(base64.b64decode(PACKED,validate=True))
    require(digest(raw) == PAYLOAD_SHA256, 'Embedded payload integrity failure')
    payload = json.loads(raw)
    require(set(payload) == set(PATHS), 'Expected exactly eight payload pages')
    requested = args.root.absolute(); root = requested.resolve(strict=True)
    require(root.is_dir(), 'Root is not a directory')
    if requested == DEFAULT_ROOT: require(root == RELEASE, 'Unexpected production release')
    lock = os.open(root,os.O_RDONLY|os.O_DIRECTORY)
    try:
        fcntl.flock(lock,(fcntl.LOCK_EX if args.apply else fcntl.LOCK_SH)|fcntl.LOCK_NB)
        plan = []
        for key,relative in PATHS.items():
            entry = snapshot(root,relative)
            entry['new'] = render(entry['old'],key,payload[key])
            entry['new_sha'] = digest(entry['new']); plan.append(entry)
        print('VALIDATED: 8 pages; root '+str(root))
        for entry in plan:
            print(entry['relative']+': '+entry['old_sha'][:12]+' -> '+entry['new_sha'][:12])
        if args.apply:
            def interrupted(signum, frame): raise RuntimeError('Interrupted by signal '+str(signum))
            for sig in (signal.SIGINT,signal.SIGTERM): signal.signal(sig,interrupted)
            apply_all(root,requested,args.backup_root,plan)
        else: print('CHECK ONLY: no files written')
    finally: os.close(lock)
    return 0

if __name__ == '__main__':
    try: result = main()
    except (Exception,KeyboardInterrupt) as error:
        print('ERROR: '+type(error).__name__+': '+str(error),file=sys.stderr); result = 1
    sys.exit(result)
