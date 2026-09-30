import {cities,placesInCity,categories} from './content.ts';
import {weatherImages} from './weatherBackgrounds.ts';
import {offlineManifest,type OfflineManifest} from './offline.ts';
type FileEntry=OfflineManifest['files'][number];
interface Pack {version:string;cache:string;files:FileEntry[];}
interface Registry {legacy?:string;packs:Record<string,Pack>;}
const META='postcard-meta',INDEX='/city-packs';
const contentName=(v:string)=>'postcard-content-'+v;
export function cityFiles(manifest:OfflineManifest,id:string){
 if(!cities.some(c=>c.id===id))throw Error('找不到这个城市。');
 const urls=new Set(placesInCity(id).flatMap(p=>[p.image,...weatherImages(p.id),...categories.map(c=>`/cards/city-v2/${p.id}-${c.id}.webp`)]));
 const files=manifest.files.filter(f=>urls.has(f.url));
 if(files.length!==urls.size)throw Error('城市内容尚未准备完整，请更新页面后重试。');
 return files;
}
export const coreFiles=(m:OfflineManifest)=>m.files.filter(f=>!f.url.startsWith('/cards/'));
async function registry():Promise<Registry>{const meta=await caches.open(META),r=await meta.match(INDEX);if(r)return r.json();const active=await meta.match('/active-pack');return {legacy:active?await active.text():undefined,packs:{}};}
async function verified(cache:Cache,files:FileEntry[]){for(const f of files){const r=await cache.match(f.url);if(!r||r.headers.has('content-encoding')||r.headers.get('x-postcard-sha')!==f.sha256)return false;}return true;}
export interface CityStatus {ready:boolean;current:boolean;bytes:number;}
export async function cityStatus(manifest:OfflineManifest,id:string):Promise<CityStatus>{
 const files=cityFiles(manifest,id),bytes=files.reduce((n,f)=>n+f.bytes,0);
 if(!('caches'in globalThis))return {ready:false,current:false,bytes};
 const meta=await caches.open(META),active=await meta.match('/active-pack');
 let coreReady=false,coreCurrent=false;
 if(active){const cache=await caches.open(contentName(await active.text())),saved=await cache.match('/offline-manifest.json');if(saved){try{coreReady=await verified(cache,coreFiles(await saved.json()));coreCurrent=await verified(cache,coreFiles(manifest));}catch{/* Cleared or incomplete shell. */}}}
 const reg=await registry(),pack=reg.packs[id];
 if(pack){const cache=await caches.open(pack.cache);return {ready:coreReady&&await verified(cache,pack.files),current:coreCurrent&&pack.files.length===files.length&&files.every(f=>pack.files.some(p=>p.url===f.url&&p.sha256===f.sha256)),bytes};}
 if(reg.legacy){const cache=await caches.open(contentName(reg.legacy));const old=await cache.match('/offline-manifest.json');if(old){try{const prior=cityFiles(await old.json(),id);return {ready:coreReady&&await verified(cache,prior),current:coreCurrent&&await verified(cache,files),bytes};}catch{/* No complete legacy city. */}}}
 return {ready:false,current:false,bytes};
}
let pending=Promise.resolve();
async function exclusive<T>(run:()=>Promise<T>):Promise<T>{
 if(navigator.locks)return await navigator.locks.request('postcard-offline-update',run);
 const task=pending.then(run);pending=task.then(()=>{},()=>{});return task;
}
async function downloadFile(cache:Cache,file:FileEntry,signal?:AbortSignal){
 signal?.throwIfAborted();if(await verified(cache,[file]))return;
 const controller=new AbortController(),abort=()=>controller.abort(signal?.reason);signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(()=>controller.abort(),30000);
 try{const r=await fetch(file.url,{cache:'reload',signal:controller.signal});if(!r.ok)throw Error('下载中断，请重试。');const body=await r.arrayBuffer();
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body))).map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==file.sha256)throw Error('内容已更新，请刷新页面后重新下载。');
 const headers=new Headers(r.headers);headers.set('x-postcard-sha',hash);for(const key of ['content-encoding','content-length','transfer-encoding','vary'])headers.delete(key);
 signal?.throwIfAborted();await cache.put(file.url,new Response(body,{status:200,headers}));
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function downloadCity(id:string,progress:(done:number,total:number)=>void,signal?:AbortSignal){return exclusive(async()=>{
 if(!('serviceWorker'in navigator)||!('caches'in globalThis))throw Error('请用 Safari 打开 HTTPS 网站下载。');
 signal?.throwIfAborted();
 const registration=await navigator.serviceWorker.getRegistration();if(!registration?.active)throw Error('离线服务还未就绪，请刷新页面后重试。');
 const manifest=await offlineManifest(signal),files=cityFiles(manifest,id),core=coreFiles(manifest);
 const cacheName=`postcard-city-${id}-${manifest.version}`,cache=await caches.open(cacheName),shell=await caches.open(contentName(manifest.version));
 let done=0;const total=core.length+files.length;progress(0,total);
 for(const [target,list] of [[shell,core],[cache,files]] as const)for(const f of list){await downloadFile(target,f,signal);progress(++done,total);}
 signal?.throwIfAborted();await shell.put('/offline-manifest.json',new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
 const reg=await registry(),previous=reg.packs[id];reg.packs[id]={version:manifest.version,cache:cacheName,files};
 const meta=await caches.open(META);await meta.put(INDEX,new Response(JSON.stringify(reg)));await meta.put('/active-pack',new Response(manifest.version));
 if(previous&&previous.cache!==cacheName)await caches.delete(previous.cache).catch(()=>false);
 try{await navigator.storage?.persist?.();}catch{/* Browser decides whether storage persists. */}
 return manifest;
});}
export function removeCity(manifest:OfflineManifest,id:string){return exclusive(async()=>{
 const files=cityFiles(manifest,id),reg=await registry();delete reg.packs[id];
 // Only static city art is removed. Account databases, custom characters and the app shell are untouched.
 for(const key of await caches.keys()){
  if(key.startsWith(`postcard-city-${id}-`))await caches.delete(key);
  if(key.startsWith('postcard-content-')){const cache=await caches.open(key);for(const f of files)await cache.delete(f.url);}
 }
 await(await caches.open(META)).put(INDEX,new Response(JSON.stringify(reg)));
});}
