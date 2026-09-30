import json,sys
from pathlib import Path
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];p=R/'production/weather-backgrounds-v1/batch.json';b=json.loads(p.read_text(encoding='utf-8'));release=R/sys.argv[1];deployment=sys.argv[2];n=0
for i in b['items']:
 if i['status']!='generated-reviewed':continue
 f=release/f'cards/weather-v1/{i["id"]}.webp'
 if f.exists() and f.read_bytes()==(R/i['output']).read_bytes():i.update(published=True,deployment=deployment,publishedAt=datetime.now(timezone.utc).isoformat());n+=1
b['published']=n==392;p.write_text(json.dumps(b,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(f'{n}/392 published in verified release.')
