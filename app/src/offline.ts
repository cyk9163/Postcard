export interface OfflineManifest {version:string;files:{url:string;sha256:string;bytes:number}[];}
export async function offlineManifest(signal?:AbortSignal){
 signal?.throwIfAborted();const controller=new AbortController(),abort=()=>controller.abort(signal?.reason),timer=setTimeout(()=>controller.abort(),25000);signal?.addEventListener('abort',abort,{once:true});
 try{const r=await fetch('/offline-manifest.json',{cache:'no-cache',signal:controller.signal});if(!r.ok)throw Error('当前为开发预览，离线包在正式构建后提供。');return await r.json() as OfflineManifest;}
 catch(e){if(controller.signal.aborted&&!signal?.aborted)throw Error('检查离线内容超时，请重试。');throw e;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
const name=(version:string)=>`postcard-content-${version}`;
export async function cacheStatus(manifest:OfflineManifest){if(!('caches'in window))return false;const cache=await caches.open(name(manifest.version));for(const f of manifest.files){const r=await cache.match(f.url);if(!r||r.headers.has('content-encoding')||r.headers.get('x-postcard-sha')!==f.sha256)return false;}return true;}
export async function downloadOffline(progress:(done:number,total:number)=>void,signal?:AbortSignal,knownManifest?:OfflineManifest){
 const run=()=>downloadFullPack(progress,signal,knownManifest);
 if(navigator.locks)return navigator.locks.request('postcard-offline-update',{signal},run);
 return run();
}
async function downloadFullPack(progress:(done:number,total:number)=>void,signal?:AbortSignal,knownManifest?:OfflineManifest){
 if(!('serviceWorker'in navigator)||!('caches'in window))throw Error('此浏览器不能保存离线内容，请使用 Safari HTTPS 页面。');
 signal?.throwIfAborted();
 await navigator.serviceWorker.ready;const manifest=knownManifest??await offlineManifest(signal);const cache=await caches.open(name(manifest.version));
 let done=0;progress(done,manifest.files.length);
 for(const file of manifest.files){
  signal?.throwIfAborted();
  const saved=await cache.match(file.url);
  if(saved?.headers.get('x-postcard-sha')===file.sha256&&!saved.headers.has('content-encoding')){progress(++done,manifest.files.length);continue;}
  // Reuse verified assets from the previous complete or per-city installation.
  const reusable=typeof caches.match==='function'?await caches.match(file.url):undefined;
  if(reusable?.headers.get('x-postcard-sha')===file.sha256&&!reusable.headers.has('content-encoding')){await cache.put(file.url,reusable);progress(++done,manifest.files.length);continue;}
  const request=new AbortController(),abort=()=>request.abort(signal?.reason),timer=setTimeout(()=>request.abort(),30000);signal?.addEventListener('abort',abort,{once:true});
  let response:Response,buffer:ArrayBuffer;
  try{response=await fetch(file.url,{cache:'reload',signal:request.signal});if(!response.ok)throw Error('下载中断，请保持页面打开后重试。');buffer=await response.arrayBuffer();}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if(hash!==file.sha256)throw Error('内容已更新，请刷新页面后重新下载。');
  const headers=new Headers(response.headers);headers.set('x-postcard-sha',hash);
  // arrayBuffer() is already decompressed; retaining transport headers breaks cached module loading.
  for(const key of ['content-encoding','content-length','transfer-encoding','vary'])headers.delete(key);
  signal?.throwIfAborted();await cache.put(file.url,new Response(buffer,{status:200,headers}));progress(++done,manifest.files.length);
 }
 signal?.throwIfAborted();
 await cache.put('/offline-manifest.json',new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
 // Publish only a complete installation. Partial downloads never replace the previous pack.
 const meta=await caches.open('postcard-meta');await meta.put('/full-pack',new Response(manifest.version));await meta.put('/active-pack',new Response(manifest.version));
 try{await navigator.storage?.persist?.();}catch{/* Manual backup remains available. */}
 return manifest;
}
