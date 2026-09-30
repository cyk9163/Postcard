"""Package only built static assets for Cloudflare Pages direct upload."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1];dist=root/'app/dist'
release=root/'releases';release.mkdir(exist_ok=True)
version=json.loads((root/'app/package.json').read_text(encoding='utf-8'))['version']
target=release/f'manyou-world-preview-{version}.zip'
manifest=json.loads((dist/'offline-manifest.json').read_text(encoding='utf-8'))
for item in manifest['files']:
 p=dist/('index.html' if item['url']=='/' else item['url'].lstrip('/'))
 assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],p
files=sorted(p for p in dist.rglob('*') if p.is_file())
assert len(files)==len(manifest['files'])+5,'Unexpected release files'
assert all(p.name not in ['debug.html','.env'] for p in files)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
 for p in files:archive.write(p,p.relative_to(dist).as_posix())
(release/'release.json').write_text(json.dumps({'version':version,'content':manifest['version'],'zip':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'files':[p.relative_to(dist).as_posix() for p in files]},indent=2),encoding='utf-8')
print(target);print(target.stat().st_size,'bytes;',len(files),'static files')
