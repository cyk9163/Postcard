import {useEffect,useRef,useState,type ReactNode} from 'react';
import {cacheStatus,downloadOffline,offlineManifest} from './offline';
import './game-install.css';
export function GameInstall({children}:{children:ReactNode}){
 const [phase,setPhase]=useState<'checking'|'downloading'|'ready'|'error'|'paused'>('checking'),[message,setMessage]=useState(''),[count,setCount]=useState([0,0]),[bytes,setBytes]=useState(0),[attempt,setAttempt]=useState(0);
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{
  if(location.port==='5173'){setPhase('ready');return;}
  const c=new AbortController();controller.current=c;let active=true;
  (async()=>{
   setPhase('checking');setMessage('');
   if(!('serviceWorker'in navigator)||!('caches'in window))throw Error('当前浏览器无法保存游戏素材。请用 Safari 打开 HTTPS 网址。');
   const existing=await navigator.serviceWorker.getRegistration();
   if(!existing?.active)await navigator.serviceWorker.register('/sw.js');
   // Bound service-worker startup so a broken registration cannot hang the install screen.
   await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('离线服务准备超时，请重新打开页面。')),15000);navigator.serviceWorker.ready.finally(()=>clearTimeout(t));})]);
   c.signal.throwIfAborted();const manifest=await offlineManifest(c.signal);if(!active)return;
   setBytes(manifest.files.reduce((n,f)=>n+f.bytes,0));
   if(!await cacheStatus(manifest)){setPhase('downloading');await downloadOffline((done,total)=>{if(active)setCount([done,total]);},c.signal,manifest);}
   if(active)setPhase('ready');
  })().catch(e=>{if(!active)return;setPhase(c.signal.aborted?'paused':'error');setMessage(c.signal.aborted?'已暂停，完成的文件会保留。':e.name==='QuotaExceededError'?'设备空间不足，请腾出空间后重试。':e.name==='AbortError'?'连接超时，请保持页面打开后重试。':e.message);});
  return()=>{active=false;c.abort();};
 },[attempt]);
 if(phase==='ready')return <>{children}</>;
 return <main className="game-install"><span className="install-stamp" aria-hidden="true">✉</span><p>漫邮 · 把世界装进口袋</p><h1>{phase==='checking'?'正在打开旅途行囊':phase==='downloading'?'正在准备完整的世界':'行囊还没装好'}</h1><p>首次进入会下载全部城市卡面、角色和简绘地图。完成后再开始游戏，无需按城市分别下载。</p>{bytes>0&&<p>完整素材约 {(bytes/1024/1024).toFixed(1)} MB。建议连接 Wi-Fi，保持页面在前台。</p>}
 {phase==='downloading'&&<><progress max={count[1]||1} value={count[0]}/><p role="status">{count[0]} / {count[1]} 个文件 · {Math.floor(count[0]/(count[1]||1)*100)}%</p><button onClick={()=>controller.current?.abort()}>暂停下载</button></>}
 {(phase==='error'||phase==='paused')&&<><p role="alert">{message}</p><button className="primary" onClick={()=>setAttempt(n=>n+1)}>继续检查并下载</button></>}
 <p className="helper">已下载的素材会复用。添加到 iPhone 主屏幕后，请从图标进入；新设备或浏览器清理素材后需要重新准备。素材下载不保存游客的旅行记录。</p></main>;
}
