const SHELL='postcard-shell-v1';
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(SHELL);await cache.addAll(['/','/manifest.webmanifest','/icons/icon-192.png']);})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 if(new URL(event.request.url).pathname.startsWith('/api/'))return;
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const url=new URL(event.request.url); const key=event.request.mode==='navigate'?'/':event.request;
  const meta=await caches.open('postcard-meta');const active=await meta.match('/active-pack');
  const full=await meta.match('/full-pack');const fullActive=!!active&&!!full&&(await active.clone().text())===(await full.text());
  const content=await caches.open('postcard-content-'+(active?await active.text():'empty')); const shell=await caches.open(SHELL);
  const index=await meta.match('/city-packs');const registry=index?await index.json():null;
  async function cached(){
   if(fullActive){const hit=await content.match(key,{ignoreVary:true});if(hit)return hit;}
   if(registry){
    const pack=Object.values(registry.packs).find(p=>p.files.some(f=>f.url===url.pathname));
    if(pack){const hit=await(await caches.open(pack.cache)).match(key,{ignoreVary:true});if(hit)return hit;}
   }
   const hit=await content.match(key,{ignoreVary:true});if(hit)return hit;
   if(registry?.legacy){const old=await(await caches.open('postcard-content-'+registry.legacy)).match(key,{ignoreVary:true});if(old)return old;}
   return shell.match(key,{ignoreVary:true});
  }
  if(event.request.cache==='reload'){
   try{const response=await fetch(event.request);if(response.ok)return response;}catch{}
   const hit=await cached();if(hit)return hit;
  }
  if(event.request.mode==='navigate'||url.pathname==='/offline-manifest.json'){
   try{const r=await fetch(event.request);if(r.ok)return r;throw Error('Offline');}
   catch{return await cached()||new Response('请联网打开一次并完成游戏素材下载。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}
  }
  return await cached()||fetch(event.request);
 })());
});
