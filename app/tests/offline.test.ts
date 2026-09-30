import test from 'node:test';import assert from 'node:assert/strict';
import {cacheStatus,downloadOffline} from '../src/offline.ts';
test('offline packs discard transport headers and a failed update preserves the active pack',async()=>{
 const stores=new Map<string,Map<string,Response>>();
 const cacheAPI={open:async(name:string)=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name)!;return {match:async(key:string)=>store.get(key)?.clone(),put:async(key:string,value:Response)=>{store.set(key,value.clone());}};}};
 Object.defineProperty(globalThis,'caches',{value:cacheAPI,configurable:true});
 Object.defineProperty(globalThis,'window',{value:{caches:cacheAPI},configurable:true});
 Object.defineProperty(globalThis,'navigator',{value:{serviceWorker:{ready:Promise.resolve()},storage:{persist:async()=>false}},configurable:true});
 const body='export const message="墨尔本";';const bytes=new TextEncoder().encode(body);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
 let manifest={version:'complete',files:[{url:'/app.js',sha256:hash,bytes:bytes.length}]};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=(async(url:string)=>url==='/offline-manifest.json'?new Response(JSON.stringify(manifest)):new Response(body,{headers:{'Content-Encoding':'gzip','Content-Length':'10','Vary':'Origin','Content-Type':'text/javascript'}})) as typeof fetch;
 try{
  await downloadOffline(()=>{});assert.equal(await cacheStatus(manifest),true);
  const cached=await (await cacheAPI.open('postcard-content-complete')).match('/app.js');
  assert.equal(await cached!.clone().text(),body);
  for(const h of ['content-encoding','content-length','vary'])assert.equal(cached!.headers.has(h),false);
  assert.equal(cached!.headers.get('content-type'),'text/javascript');
  manifest={version:'broken-update',files:[{url:'/app.js',sha256:'incorrect',bytes:bytes.length}]};
  await assert.rejects(downloadOffline(()=>{}),/内容已更新/);
  assert.equal(await(await(await cacheAPI.open('postcard-meta')).match('/active-pack'))!.text(),'complete');
  manifest={version:'resumable',files:[{url:'/app.js',sha256:hash,bytes:bytes.length},{url:'/extra.js',sha256:hash,bytes:bytes.length}]};
  const controller=new AbortController();
  await assert.rejects(downloadOffline(done=>{if(done===1)controller.abort();},controller.signal),{name:'AbortError'});
  assert.equal(await(await(await cacheAPI.open('postcard-meta')).match('/active-pack'))!.text(),'complete');
  const requests:string[]=[];const mock=globalThis.fetch;
  globalThis.fetch=(async(url:any,options:any)=>{requests.push(url);return mock(url,options);}) as typeof fetch;
  await downloadOffline(()=>{});
  assert.ok(!requests.includes('/app.js'),'resume reuses the verified completed file');
  assert.ok(requests.includes('/extra.js'));
  assert.equal(await cacheStatus(manifest),true);
  assert.equal(await(await(await cacheAPI.open('postcard-meta')).match('/full-pack'))!.text(),'resumable');
 }finally{globalThis.fetch=originalFetch;}
});
