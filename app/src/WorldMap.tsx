import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './sketch-map.css';
import {places,cities,placesInCity,cityById,type Place} from './content';
import {trackSegments,type Walk} from './journey';
import type {Visit} from './domain';

export function WorldMap({cityId,visits,walks,location,onPlace}:{cityId:string;visits:Visit[];walks:Walk[];location:{lat:number;lng:number}|null;onPlace:(p:Place)=>void}){
 const element=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),pins=useRef<L.LayerGroup|null>(null),routes=useRef<L.LayerGroup|null>(null);
 const latest=useRef({visits,onPlace});latest.current={visits,onPlace};
 const land=useRef<L.GeoJSON|null>(null);const [zoom,setZoom]=useState(13);
 const redraw=useRef(()=>{}),[tileError,setTileError]=useState(false),[onlyVisited,setOnlyVisited]=useState(false);
 const filter=useRef(false);filter.current=onlyVisited;
 const currentCity=useRef(cityId);currentCity.current=cityId;
 const bounds=()=>L.latLngBounds(placesInCity(cityId).map(p=>[p.lat,p.lng] as L.LatLngTuple));
 useEffect(()=>{
  if(!element.current)return;
  const m=L.map(element.current,{attributionControl:false,scrollWheelZoom:false,minZoom:0,maxZoom:19,worldCopyJump:false,maxBounds:[[-85,-180],[85,180]],maxBoundsViscosity:1});map.current=m;
  m.fitBounds(bounds(),{padding:[35,35],maxZoom:13});
  const controller=new AbortController();
  fetch('/maps/land.geojson',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Map unavailable');return r.json();}).then(data=>{
   if(controller.signal.aborted)return;
   land.current=L.geoJSON(data,{interactive:false,style:{color:'#759777',weight:1.5,fillColor:'#e3e6ba',fillOpacity:1}});
   redraw.current();
  }).catch(()=>{if(!controller.signal.aborted)setTileError(true);});
  pins.current=L.layerGroup().addTo(m);routes.current=L.layerGroup().addTo(m);
  redraw.current=()=>{
   const group=pins.current!;group.clearLayers();setZoom(m.getZoom());if(land.current){if(m.getZoom()<=7&&!m.hasLayer(land.current))land.current.addTo(m);else if(m.getZoom()>7&&m.hasLayer(land.current))m.removeLayer(land.current);}const seen=new Set(latest.current.visits.map(v=>v.placeId));
   const available=places.filter(p=>!filter.current||seen.has(p.id));
   const cells=new Map<string,Place[]>();
   for(const p of available){const point=m.project([p.lat,p.lng]);const key=m.getZoom()<15?Math.floor(point.x/64)+':'+Math.floor(point.y/64):p.id;cells.set(key,[...(cells.get(key)??[]),p]);}
   for(const items of cells.values()){
    if(items.length>1){
     const centre:L.LatLngTuple=[items.reduce((s,p)=>s+p.lat,0)/items.length,items.reduce((s,p)=>s+p.lng,0)/items.length];
     const cluster=L.marker(centre,{icon:L.divIcon({className:'map-cluster',html:`<span>${items.length}</span>`,iconSize:[42,42],iconAnchor:[21,21]}),title:`${items.length} 个有卡片的地点，点击放大`,alt:`${items.length} 个有卡片的地点，点击放大`}).on('click',()=>m.fitBounds(L.latLngBounds(items.map(p=>[p.lat,p.lng])),{padding:[55,55],maxZoom:17})).addTo(group);cluster.getElement()?.setAttribute('aria-label',`${items.length} 个卡片地点，点击放大`);continue;
    }
    const p=items[0],visited=seen.has(p.id);
    const marker=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'world-pin '+(visited?'visited':''),html:`<span>${visited?'✓':'✉'}</span>`,iconSize:[32,42],iconAnchor:[16,42],popupAnchor:[0,-36]}),title:p.name,alt:p.name});
    const card=document.createElement('div');card.className='map-place-popup';const heading=document.createElement('strong');heading.textContent=p.name;const info=document.createElement('p');info.textContent=(visited?'已到访':'等待你的脚步')+' · 3 张卡面';const button=document.createElement('button');button.type='button';button.textContent='查看地点与卡片';button.onclick=()=>latest.current.onPlace(p);card.append(heading,info,button);marker.bindPopup(card).addTo(group);const label=document.createElement('span');label.textContent=p.name;marker.bindTooltip(label,{permanent:m.getZoom()>=12,direction:'top',offset:[0,-38],className:'sketch-place-name'});marker.getElement()?.setAttribute('aria-label',p.name+'，'+(visited?'已到访':'有卡片')); 
   }
  };
  m.on('zoomend',()=>redraw.current());redraw.current();
  let wasVisible=false;
  const observer=new ResizeObserver(()=>{
   const visible=!!element.current?.clientWidth;
   m.invalidateSize({pan:false});
   if(visible&&!wasVisible)m.fitBounds(L.latLngBounds(placesInCity(currentCity.current).map(p=>[p.lat,p.lng])),{padding:[35,35],maxZoom:13});
   wasVisible=visible;
  });observer.observe(element.current);
  return()=>{controller.abort();observer.disconnect();land.current=null;m.remove();map.current=null;pins.current=null;routes.current=null;};
 },[]);
 useEffect(()=>{if(map.current&&bounds().isValid())map.current.fitBounds(bounds(),{padding:[35,35],maxZoom:13});},[cityId]);
 useEffect(()=>{redraw.current();},[visits,onlyVisited]);
 useEffect(()=>{const group=routes.current;if(!group)return;group.clearLayers();for(const walk of walks)for(const segment of trackSegments(walk.points)){if(segment.length>1)L.polyline(segment.map(p=>[p.lat,p.lng]),{color:'#c36d3b',weight:4,opacity:.85}).addTo(group);}if(location)L.circleMarker([location.lat,location.lng],{radius:7,color:'#fff',weight:3,fillColor:'#287cc1',fillOpacity:1}).bindTooltip('你的位置').addTo(group);},[walks,location]);
 return <div className="world-map-section"><div className="section-title"><h2>我的旅行地图</h2><span>{places.length} 个地点有卡片</span></div><p className="helper">拖动、缩放简绘地图，点图钉查看卡片。已开放 {cities.length} 个城市，当前浏览{cityById(cityId).name}。</p><div className="map-toolbar"><button onClick={()=>map.current?.fitWorld()}>查看世界</button><button onClick={()=>map.current?.fitBounds(bounds(),{padding:[35,35],maxZoom:13})}>回到{cityById(cityId).name}</button><button aria-pressed={onlyVisited} onClick={()=>setOnlyVisited(!onlyVisited)}>{onlyVisited?'显示全部地点':'只看我去过的'}</button></div><div ref={element} className={`world-map world-map-sketch ${zoom>7?'is-local':'is-world'}`} role="region" aria-label="可拖动缩放的世界地图，图钉代表有卡片的地点"/>{tileError&&<p role="status" className="map-warning">世界轮廓素材暂时缺失。景点图钉仍可使用，重新打开游戏可检查并补全素材。</p>}<p className="world-legend"><span>✉ 有卡片</span><span>✓ 已到访</span><span>数字圆点：点击展开多个地点</span></p>{onlyVisited&&!visits.length&&<p>你还没有记录到访，切回全部地点开始探索吧。</p>}<p className="helper">简绘地图随游戏素材下载，可离线使用。城市视图只示意景点方位，不显示道路或站点，不用于导航。</p><p className="helper"><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">世界轮廓：Natural Earth</a> · 城市层级不使用低精度海岸线。</p></div>;
}
