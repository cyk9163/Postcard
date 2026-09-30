import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {placesInCity,categories} from '../src/content.ts';
import {cityFiles,coreFiles,downloadCity,cityStatus,removeCity} from '../src/city-offline.ts';
import {downloadOffline} from '../src/offline.ts';
import {weatherImages} from '../src/weatherBackgrounds.ts';
const urls=(id:string)=>[...new Set(placesInCity(id).flatMap(p=>[p.image,...weatherImages(p.id),...categories.map(c=>`/cards/city-v2/${p.id}-${c.id}.webp`)]))];
async function fixture(){
 const stores=new Map<string,Map<string,Response>>(),requests:string[]=[];const key=(k:any)=>new URL(typeof k==='string'?k:k.url,'https://example.test').pathname;
 const caches={keys:async()=>[...stores.keys()],delete:async(n:string)=>stores.delete(n),open:async(n:string)=>{if(!stores.has(n))stores.set(n,new Map());const s=stores.get(n)!;return {match:async(k:any)=>s.get(key(k))?.clone(),put:async(k:any,r:Response)=>{s.set(key(k),r.clone());},delete:async(k:any)=>s.delete(key(k))};}};
 const files=await Promise.all(['/', '/app.js',...urls('queenstown'),...urls('wellington')].map(async url=>{const body=new TextEncoder().encode(url);return {url,bytes:body.length,sha256:Buffer.from(await crypto.subtle.digest('SHA-256',body)).toString('hex')};}));
 let manifest={version:'one',files},broken='',offline=false;
 const original=globalThis.fetch;Object.defineProperty(globalThis,'caches',{value:caches,configurable:true});Object.defineProperty(globalThis,'navigator',{value:{serviceWorker:{getRegistration:async()=>({active:{}})},storage:{persist:async()=>false}},configurable:true});
 globalThis.fetch=(async(input:any)=>{const url=key(input);requests.push(url);if(offline)throw Error('offline');return url==='/offline-manifest.json'?new Response(JSON.stringify(manifest)):new Response(url===broken?'broken':url,{headers:{'Content-Encoding':'gzip','Content-Length':'3','Content-Type':'text/plain'}});}) as typeof fetch;
 return {caches,requests,get manifest(){return manifest;},update:(v:string)=>{manifest={...manifest,version:v,files:manifest.files.map(f=>({...f}))};},fail:(url:string)=>{broken=url;},offline:()=>{offline=true;},restore:()=>{globalThis.fetch=original;}};
}

test('complete installation takes precedence over an older per-city registry while offline',async()=>{
 const f=await fixture();try{
  Object.defineProperty(globalThis,'window',{value:{caches:f.caches},configurable:true});
  await downloadCity('queenstown',()=>{});
  const url=urls('queenstown')[0];await(await f.caches.open('postcard-city-queenstown-one')).put(url,new Response('outdated city image'));
  await downloadOffline(()=>{});
  f.offline();const listeners:Record<string,(e:any)=>void>={};vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(n:string,fn:any)=>{listeners[n]=fn;}},caches:f.caches,fetch:globalThis.fetch,URL,Response});
  let result:Promise<Response>|undefined;listeners.fetch({request:new Request('https://example.test'+url),respondWith:(p:Promise<Response>)=>{result=p;}});
  assert.equal(await(await result!).text(),url,'full world asset wins over stale city cache');
 }finally{f.restore();}
});
test('city download isolates images, resumes verified files, and service worker serves multiple packs offline',async()=>{
 const f=await fixture();try{
  assert.equal(coreFiles(f.manifest).length,2);assert.equal(cityFiles(f.manifest,'queenstown').length,urls('queenstown').length);
  await downloadCity('queenstown',()=>{});assert.ok((await cityStatus(f.manifest,'queenstown')).ready);assert.equal((await cityStatus(f.manifest,'wellington')).ready,false);
  assert.ok(urls('wellington').every(u=>!f.requests.includes(u)));
  const count=f.requests.length;await downloadCity('queenstown',()=>{});assert.deepEqual(f.requests.slice(count),['/offline-manifest.json']);
  await downloadCity('wellington',()=>{});
  const response=await(await f.caches.open('postcard-city-queenstown-one')).match(urls('queenstown')[0]);assert.equal(response!.headers.has('content-encoding'),false);
  f.offline();const listeners:Record<string,(e:any)=>void>={};vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self:{location:{origin:'https://example.test'},addEventListener:(n:string,fn:any)=>{listeners[n]=fn;}},caches:f.caches,fetch:globalThis.fetch,URL,Response});
  async function load(path:string,navigate=false){let result:Promise<Response>|undefined;const request=new Request('https://example.test'+path);if(navigate)Object.defineProperty(request,'mode',{value:'navigate'});listeners.fetch({request,respondWith:(p:Promise<Response>)=>{result=p;}});return result!;}
  for(const u of [...urls('queenstown'),...urls('wellington'),'/app.js'])assert.equal(await(await load(u)).text(),u);
  assert.equal(await(await load('/',true)).text(),'/');
  await removeCity(f.manifest,'queenstown');assert.equal((await cityStatus(f.manifest,'queenstown')).ready,false);assert.ok((await cityStatus(f.manifest,'wellington')).ready);await assert.rejects(load(urls('queenstown')[0]),/offline/);
 }finally{f.restore();}
});
test('failed or cancelled city updates preserve published pack and legacy packs survive migration',async()=>{
 const f=await fixture();try{
  // Simulate the previously supported complete-world download.
  const legacy=await f.caches.open('postcard-content-legacy');for(const file of f.manifest.files)await legacy.put(file.url,new Response(file.url,{headers:{'x-postcard-sha':file.sha256}}));await legacy.put('/offline-manifest.json',new Response(JSON.stringify(f.manifest)));
  await(await f.caches.open('postcard-meta')).put('/active-pack',new Response('legacy'));
  await downloadCity('queenstown',()=>{});assert.ok((await cityStatus(f.manifest,'wellington')).ready);
  f.update('two');f.fail(urls('queenstown')[0]);await assert.rejects(downloadCity('queenstown',()=>{}),/内容已更新/);
  const meta=await f.caches.open('postcard-meta');assert.equal(await(await meta.match('/active-pack'))!.text(),'one');assert.equal((await(await meta.match('/city-packs'))!.json()).packs.queenstown.version,'one');
  f.fail('');const c=new AbortController();await assert.rejects(downloadCity('queenstown',(n)=>{if(n===1)c.abort();},c.signal),{name:'AbortError'});assert.ok((await cityStatus(f.manifest,'queenstown')).ready);
  await removeCity(f.manifest,'wellington');assert.equal((await cityStatus(f.manifest,'wellington')).ready,false);assert.ok((await cityStatus(f.manifest,'queenstown')).ready);assert.ok(await legacy.match('/app.js'));
 }finally{f.restore();}
});
