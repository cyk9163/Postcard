import {useEffect,useState} from 'react';
import {Download} from 'lucide-react';
import {cacheStatus,offlineManifest} from './offline';
export function CityDownloads({onNotice:_onNotice}:{onNotice:(text:string)=>void}){
 const [status,setStatus]=useState('正在检查素材…');
 useEffect(()=>{let active=true;offlineManifest().then(async m=>{const ready=await cacheStatus(m);if(active)setStatus(`${ready?'完整素材已就绪':'素材需要补全'} · 约 ${(m.files.reduce((n,f)=>n+f.bytes,0)/1024/1024).toFixed(1)} MB`);}).catch(()=>{if(active)setStatus('暂时无法检查，联网后可以重新打开页面补全。');});return()=>{active=false;};},[]);
 return <article className="setting-card"><Download size={26}/><h2>整个世界，都在行囊里</h2><p>首次进入统一准备所有城市卡面、角色与简绘地图，不再需要按城市下载。</p><p role="status">{status}</p><button className="secondary" onClick={()=>location.reload()}>重新打开并检查素材</button><p className="helper">素材属于当前设备的浏览器；换设备或清理缓存后需要重新下载。账号同步和收寄信仍需联网。重新打开会结束游客的临时试用。</p></article>;
}
