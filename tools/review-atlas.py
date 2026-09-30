"""Create contact sheets of completed NEW card sets for visual review."""
import pathlib,json,sys,argparse,re
from PIL import Image,ImageDraw
R=pathlib.Path(__file__).resolve().parents[1];styles=['landmark','atmosphere','detail']
parser=argparse.ArgumentParser();parser.add_argument('--pack',default='atlas');parser.add_argument('--pending',action='store_true');args=parser.parse_args();assert re.fullmatch('[a-z-]+',args.pack)
catalog=json.loads((R/f'content/{args.pack}-candidates.json').read_text(encoding='utf-8'))
cities=[{**c,'spots':[s]} for c in catalog for s in c.get('spots',[])]
refs={p['id']:p for p in json.loads((R/'content/world-references.json').read_text(encoding='utf-8'))}
done=[refs[c['id']+'-'+c['spots'][0][0]] for c in cities if all((R/f'app/public/cards/city-v2/{c["id"]}-{c["spots"][0][0]}-{s}.webp').exists() for s in styles)]
if args.pending:
 reviewedPath=R/f'production/{args.pack}-reviewed.json';reviewed=json.loads(reviewedPath.read_text()) if reviewedPath.exists() else []
 done=[p for p in done if p['id'] not in reviewed]
for batch in range((len(done)+5)//6):
 subset=done[batch*6:(batch+1)*6];sheet=Image.new('RGB',(1200,len(subset)*190),'#eee');d=ImageDraw.Draw(sheet)
 for i,p in enumerate(subset):
  for j,c in enumerate(['reference',*styles]):
   path=R/f'production/world-references/{p["id"]}.jpg' if c=='reference' else R/f'app/public/cards/city-v2/{p["id"]}-{c}.webp'
   im=Image.open(path);im.thumbnail((295,164));sheet.paste(im,(j*300,i*190));d.text((j*300+3,i*190+168),p['id']+' '+c,fill='black')
 sheet.save(R/f'production/{args.pack}-art-{batch}.jpg')
(R/f'production/{args.pack}-review-index.json').write_text(json.dumps([p['id'] for p in done]))
print('Complete cities',len(done),'sheets',(len(done)+5)//6)
