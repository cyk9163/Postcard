import {useEffect,useState,type ComponentProps} from 'react';
import {isGuestMode} from './db';
type JourneyComponent=typeof import('./JourneyPanel')['Journey'];
export function LazyJourney(props:ComponentProps<JourneyComponent>){
 const [View,setView]=useState<JourneyComponent|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;import('./JourneyPanel').then(module=>{if(active)setView(()=>module.Journey);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
 if(View)return <View {...props}/>;
 return <section className="map-loading" aria-label="地图加载"><p role="status">{error?'地图暂时没能打开。请联网后重新打开页面，或切回精选地点继续浏览。已保存的记录仍保留。':'正在打开地图…'}</p>{error&&<>{isGuestMode&&<p className="helper">重新打开会结束本次游客试用，临时内容会清空。</p>}<button className="secondary" onClick={()=>window.location.reload()}>重新打开页面</button></>}</section>;
}
