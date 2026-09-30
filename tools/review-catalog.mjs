import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {places,categories,cityById,cityIdOf} from '../app/src/content.ts';
import {cardLayout,cardLayoutOverrides} from '../app/src/layout.ts';
const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'content/card-review.json');
const previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{cards:[]};
const old=new Map(previous.cards.map(c=>[c.id,c]));
const cards=places.flatMap(p=>categories.map(category=>{
 const id=p.id+':'+category.id,url=`/cards/city-v2/${p.id}-${category.id}.webp`,bytes=fs.readFileSync(path.join(root,'app/public',url));
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex'),prior=old.get(id),layout=cardLayout(p.id,category.id);
 return {id,placeId:p.id,place:p.name,cityId:cityIdOf(p),city:cityById(cityIdOf(p)).name,category:category.name,image:url,sha256,bytes:bytes.length,credit:p.credit,
  composition:{reviewed:!!cardLayoutOverrides[id],human:layout.human,anchors:layout.anchors,note:layout.humanNote??''},
  review:prior?.sha256===sha256?prior.review:{status:'pending',reviewer:'',note:'',at:null},
  ...(prior&&prior.sha256!==sha256?{previousReview:prior.review}:{}),
 };
}));
const index=process.argv.indexOf('--import');
if(index!==-1){
 const input=process.argv[index+1];if(!input)throw Error('Provide a review JSON path');
 if(fs.statSync(input).size>2_000_000)throw Error('Review file exceeds 2 MB');
 const data=JSON.parse(fs.readFileSync(input,'utf8'));
 if(data.format!=='manyou-asset-reviews'||data.version!==1||!Array.isArray(data.reviews)||data.reviews.length>cards.length)throw Error('Invalid review export');
 const map=new Map(cards.map(c=>[c.id,c])),seen=new Set();
 // Validate every entry before writing anything; imported content never changes paths or sources.
 for(const r of data.reviews){
  const card=map.get(r.id);if(!card||seen.has(r.id)||card.sha256!==r.sha256)throw Error('Unknown, duplicate or stale card: '+r.id);seen.add(r.id);
  if(!['pending','needs-adjustment','approved'].includes(r.status)||typeof r.reviewer!=='string'||r.reviewer.length>80||typeof r.note!=='string'||r.note.length>1500||!Number.isFinite(Date.parse(r.at)))throw Error('Invalid review fields: '+r.id);
  if(r.status!=='pending'&&(!r.reviewer.trim()||!r.note.trim()))throw Error('Reviewed cards require reviewer and note: '+r.id);
 }
 for(const r of data.reviews)map.get(r.id).review={status:r.status,reviewer:r.reviewer.trim(),note:r.note.trim(),at:r.at};
}
const catalog={format:'manyou-card-review-catalog',version:1,generatedAt:new Date().toISOString(),cards};
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
const template=fs.readFileSync(path.join(root,'tools/asset-review-template.html'),'utf8');
fs.writeFileSync(path.join(root,'app/asset-review.html'),template.replace('/*CATALOG*/',JSON.stringify(catalog).replaceAll('<','\\u003c')));
console.log(`Catalog: ${cards.length} cards; ${cards.filter(c=>c.composition.reviewed).length} explicit composition reviews; ${cards.filter(c=>c.review.status==='approved').length} final approvals.`);
