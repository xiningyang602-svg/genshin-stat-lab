"""Reassemble the reviewed static release from verified bytes only."""
import base64
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import zipfile

root = Path.cwd()
staging = root / '.codex-release-appearance'
sha = lambda data: hashlib.sha256(data).hexdigest()
metadata = json.loads((staging / 'manifest.json').read_text(encoding='utf-8'))
recipe_bytes = b''.join((staging / p).read_bytes() for p in metadata['recipeParts'])
assert sha(recipe_bytes) == metadata['recipeSha256'], 'Transfer digest mismatch'
recipe = json.loads(recipe_bytes)
offline = root / 'teyvat-offline.zip'
base = offline.read_bytes()
assert sha(base) == recipe['baseSha256'], 'Offline baseline changed'
pieces = []
for item in recipe['operations']:
    if 'copy' in item:
        offset, size = item['copy']
        assert 0 <= offset <= offset + size <= len(base)
        pieces.append(base[offset:offset+size])
    else:
        pieces.append(base64.b64decode(item['data'], validate=True))
target = b''.join(pieces)
assert len(target) == recipe['targetBytes'] and sha(target) == recipe['targetSha256']

release_data = (staging / 'release-manifest.json').read_bytes()
entries = {x['path']: x for x in json.loads(release_data)['files']}
with zipfile.ZipFile(io.BytesIO(target)) as bundle:
    expected = set(entries) - {'teyvat-offline.zip'}
    assert len(bundle.namelist()) == len(expected) and set(bundle.namelist()) == expected
    for name in sorted(expected):
        rel = PurePosixPath(name)
        assert not rel.is_absolute() and '..' not in rel.parts and '\\' not in name
        assert len(rel.parts) == 1 or rel.parts[:2] == ('vendor','ocr')
        body = bundle.read(name)
        record = entries[name]
        assert len(body) == record['bytes'] and sha(body) == record['sha256'], name
        path = root.joinpath(*rel.parts)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
offline.write_bytes(target)
(root / 'release-manifest.json').write_bytes(release_data)
for name, record in metadata['files'].items():
    body = (root / name).read_bytes()
    assert len(body) == record['bytes'] and sha(body) == record['sha256'], name
print(f"Verified {len(metadata['files'])} public files and the offline ZIP ({len(target)} bytes).")
