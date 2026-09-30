import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=process.argv[2]?path.resolve(process.argv[2]):path.resolve(import.meta.dirname,'../app/dist');
const sources=JSON.parse(fs.readFileSync(path.join(root,'content-sources.json'),'utf8'));
if(sources.version==='world-v1'){
 const catalog=JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname,'../content/world-cities.json'),'utf8'));
 if(sources.cities?.length!==catalog.length)throw Error('World city catalog is incomplete');
 const world=sources.places.filter(p=>p.cityId),expected=catalog.flatMap(c=>(c.spots??[]).map(s=>c.id+'-'+s[0]));
 if(world.length!==expected.length||new Set(world.map(p=>p.id)).size!==expected.length||expected.some(id=>!world.some(p=>p.id===id)))throw Error('World place catalog is incomplete');
 for(const place of world)for(const category of ['landmark','atmosphere','detail'])if(!fs.existsSync(path.join(root,`cards/city-v2/${place.id}-${category}.webp`)))throw Error(`Missing world card: ${place.id}-${category}`);
}
for(const place of ['flinders','federation','gardens','shrine','library','museum','exhibition','carlton','ngv','acmi','market','cathedral','patrick','fitzroy','parliament','townhall','cooks','stkilda','albert','docklands'])for(const category of ['landmark','atmosphere','detail'])if(!fs.existsSync(path.join(root,`cards/city-v2/${place}-${category}.webp`)))throw Error(`Missing city card: ${place}-${category}`);
for(const actor of ['mira','leo','iris','noah','luna','kai'])for(const pose of ['camera','sit'])if(!fs.existsSync(path.join(root,`companions/v2/${actor}-${pose}.webp`)))throw Error(`Missing unlocked pose: ${actor}-${pose}`);
for(const place of ['flinders','federation','gardens','shrine','library']){if(!fs.existsSync(path.join(root,`cards/preview-1/${place}.webp`)))throw Error(`Missing required postcard image: ${place}`);}
for(const actor of ['mira','leo','iris','noah','luna','kai','mikan','mugi'])for(const pose of ['stand','wave']){if(!fs.existsSync(path.join(root,`companions/v1/${actor}-${pose}.webp`)))throw Error(`Missing companion image: ${actor}-${pose}`);}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root).filter(f=>!['_headers','sw.js','offline-manifest.json','_worker.js','_routes.json'].includes(path.basename(f))).map(f=>{const bytes=fs.readFileSync(f);const rel=path.relative(root,f).replaceAll('\\','/');return {url:rel==='index.html'?'/':'/'+rel,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};});
const version=crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,12);
fs.writeFileSync(path.join(root,'offline-manifest.json'),JSON.stringify({version,files},null,2));
fs.appendFileSync(path.join(root,'sw.js'),`\n// App content build ${version}\n`);
console.log(`Offline manifest: ${files.length} files, ${files.reduce((s,f)=>s+f.bytes,0)} bytes, ${version}`);
