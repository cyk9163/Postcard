import {useEffect,useState} from 'react';
import {Mail} from 'lucide-react';
import App from './App';
import {CloudAccount} from './Cloud';
import {databaseAccount,startGuestMode} from './db';
import type {CloudUser} from './sync';

export default function Entry(){
 const [screen,setScreen]=useState<'checking'|'login'|'app'>('checking');
 const [unavailable,setUnavailable]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  const timer=setTimeout(()=>controller.abort(),8000);
  fetch('/api/me',{credentials:'same-origin',cache:'no-store',signal:controller.signal}).then(async r=>{
   if(!active)return;
   if(r.status===401){setScreen('login');return;}
   if(!r.ok)throw Error('Unavailable');
   const u=await r.json() as CloudUser;
   if(!active)return;
   if(!u.id)throw Error('Unavailable');
   if(databaseAccount!==u.id){localStorage.setItem('manyou-account',u.id);location.reload();return;}
   setScreen('app');
  }).catch(()=>{if(active){setUnavailable(true);setScreen('login');}}).finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[]);
 if(screen==='app')return <App/>;
 return <main className="entry-page"><div className="entry-brand"><Mail size={28}/><span>漫邮<small>POSTCARD · WORLD</small></span></div><h1>每一步，都有自己的故事。</h1><p className="entry-intro">登录你的旅册，收藏去过的地方，和旅伴一起留下明信片。</p>{screen==='checking'?<p role="status">正在打开你的旅册…</p>:<>
 {unavailable&&<p role="status">暂时无法连接云端。可以稍后重试，或查看已保存在这台设备的记录。</p>}
 <CloudAccount signedOut onNotice={setNotice} onRefresh={async()=>{}}/>
 {notice&&<p className="entry-notice" role="status">{notice}</p>}
 <button className="secondary entry-guest" onClick={async()=>{try{await startGuestMode();setScreen('app');}catch{setNotice('暂时无法开启试用，请刷新后重试。');}}}>游客试用 · 不保存记录</button>
 {unavailable&&databaseAccount&&<button className="secondary" onClick={()=>setScreen('app')}>离线打开本机旅册</button>}
 {unavailable&&<button className="text-button" onClick={()=>location.reload()}>重新连接</button>}
 <p className="helper">已有账号会保持登录。游客试用刷新即清空。以前保存的本机游客记录仍保留，登录后可复制到自己的账号。</p>
 </>}</main>;
}
