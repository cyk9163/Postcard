import {cities,placesInCity,cityIdOf,placeById} from './content';
import type {Visit,Postcard} from './domain';
import './achievements.css';
export function CityAchievements({visits,cards,selected,onSelect}:{visits:Visit[];cards:Postcard[];selected:string;onSelect:(id:string)=>void}){
 const visited=new Set(visits.map(v=>v.placeId));
 const touched=new Set(visits.map(v=>cityIdOf(placeById(v.placeId))));
 return <div className="city-achievements"><div className="achievement-summary"><div><strong>{touched.size}</strong><span>到访城市</span></div><div><strong>{visited.size}</strong><span>本人足迹</span></div><div><strong>{cards.length}</strong><span>收藏卡片</span></div></div><p className="helper">城市印章来自本人到访。宠物带回的卡片计入收藏，不算你亲自去过。</p><div className="city-stamp-rail" role="group" aria-label="按城市查看成就与足迹"><button aria-pressed={selected==='all'} onClick={()=>onSelect('all')}><strong>全部城市</strong><span>打开整本旅册</span></button>{cities.map(city=>{const count=placesInCity(city.id).filter(p=>visited.has(p.id)).length,total=placesInCity(city.id).length,collected=cards.filter(c=>cityIdOf(placeById(c.placeId))===city.id).length;return <button key={city.id} className={count?'city-earned':''} aria-pressed={selected===city.id} onClick={()=>onSelect(city.id)}><strong>{count?'✓ ':''}{city.name}</strong><span>足迹 {count} / {total}</span><small>{collected} 张收藏</small></button>;})}</div></div>;
}
