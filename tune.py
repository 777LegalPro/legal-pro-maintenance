#!/usr/bin/env python3
"""Targeted public gratitude update; uses the previously verified transaction core."""
import argparse
import hashlib
import re
import signal
import sys
import types
from pathlib import Path

CORE_SHA = '111d3a2c57c76336e5a65354feaa51c2898d89dc8daac4412aa450d6d0300c07'
OLD_ORG = 'ГБУЗ ТО «Областной наркологический диспансер»'
OLD_LINK = '<div class="recognition-card-footer"><a href="https://ond72.ru/staff/meditsinskie-rabotniki/rukovoditeli/" target="_blank" rel="noopener noreferrer">Об учреждении <span aria-hidden="true">↗</span></a></div>'
PEOPLE = [
 ('suslov-evgeniy-mihaylovich', 'Суслов Евгений Михайлович', 'Врач по медицинской профилактике ГАУЗ ТО «Городская поликлиника № 1»'),
 ('ilyina-anastasiya-sergeevna', 'Ильина Анастасия Сергеевна', 'Судья Центрального районного суда города Тюмени'),
]

def transform(source, key):
    if key == 'home':
        if 'Все 16 благодарностей' in source:
            return source
        assert source.count('Все 14 благодарностей') == 1, 'Home counter mismatch'
        return source.replace('Все 14 благодарностей', 'Все 16 благодарностей', 1)
    pattern = r'<article\b[^>]*\bid="thanks-pushkarev-vladimir-petrovich"[^>]*>.*?</article>'
    matches = list(re.finditer(pattern, source, re.S))
    assert len(matches) == 1, 'Pushkarev card mismatch'
    match = matches[0]
    before = match.group(0)
    after = before
    if OLD_ORG in before:
        assert before.count(OLD_ORG) == 1
        after = after.replace(OLD_ORG, 'ОНД', 1)
    else:
        assert 'ОНД · Тюмень' in before, 'Unexpected institution text'
    if 'Об учреждении' in before:
        assert before.count(OLD_LINK) == 1, 'Institution link markup changed'
        after = after.replace(OLD_LINK, '', 1)
    assert 'Об учреждении' not in after and 'ond72.ru' not in after
    source = source[:match.start()] + after + source[match.end():]
    present = [source.count('id="thanks-'+slug+'"') for slug, _, _ in PEOPLE]
    assert present in ([0, 0], [1, 1]), 'Partial new-card set'
    if present == [0, 0]:
        assert source.count('class="recognition-card"') == 14, 'Expected 14 current cards'
        marker = '</article></div><p class="source-line">'
        assert source.count(marker) == 1, 'Recognition grid boundary mismatch'
        cards = ''.join('<article class="recognition-card" id="thanks-'+slug+'">'
            '<div class="recognition-card-heading"><span class="recognition-label">Личная благодарность</span>'
            '<h2>'+name+'</h2><p class="recognition-role">'+role+'</p></div>'
            '<p class="recognition-appreciation">С благодарностью за Вашу работу. Артем Винтенко.</p></article>'
            for slug, name, role in PEOPLE)
        source = source.replace(marker, '</article>'+cards+'</div><p class="source-line">', 1)
    assert source.count('class="recognition-card"') == 16
    return source

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    core_path = Path('/tmp/u.py')
    core_bytes = core_path.read_bytes()
    assert hashlib.sha256(core_bytes).hexdigest() == CORE_SHA, 'Transaction core hash mismatch'
    core = types.ModuleType('prolg_transaction_core')
    exec(compile(core_bytes, str(core_path), 'exec'), core.__dict__)
    core.PAYLOAD_SHA256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    requested = Path('/opt/legal-pro/current')
    root = requested.resolve(strict=True)
    assert root == Path('/opt/legal-pro/releases/20261021-0245'), 'Release changed'
    lock = core.os.open(root, core.os.O_RDONLY | core.os.O_DIRECTORY)
    try:
        core.fcntl.flock(lock, core.fcntl.LOCK_EX | core.fcntl.LOCK_NB)
        plan = []
        for key, relative in [('home','dist/index.html'), ('thanks','dist/thanks/index.html')]:
            entry = core.snapshot(root, relative)
            source = entry['old'].decode('utf-8')
            output = transform(source, key)
            old, new = core.Scan(source), core.Scan(output)
            new.single('main'); new.single('h1')
            for tag in ('head', 'header', 'footer'):
                assert [source[n['start']:n['end']] for n in old.select(tag)] == [output[n['start']:n['end']] for n in new.select(tag)], tag+' changed'
            entry['new'] = output.encode('utf-8')
            entry['new_sha'] = core.digest(entry['new'])
            plan.append(entry)
        print('VALIDATED: 2 pages, 16 thanks; OND label; institution link removed', flush=True)
        if args.apply:
            def interrupted(signum, frame):
                raise RuntimeError('Interrupted by signal '+str(signum))
            for sig in (signal.SIGINT, signal.SIGTERM): signal.signal(sig, interrupted)
            core.apply_all(root, requested, Path('/var/backups'), plan)
        else:
            print('CHECK ONLY: no files written')
    finally:
        core.os.close(lock)

if __name__ == '__main__':
    main()
