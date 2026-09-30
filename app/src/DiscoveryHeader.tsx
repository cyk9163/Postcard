import {useState} from 'react';
import {Search,MapPin,ArrowUpRight,Compass,BookOpen} from 'lucide-react';
import {cities,cityById,placesInCity,places} from './content';

export function DiscoveryHeader({cityId,onCity,visited,cards,onCollection}:{cityId:string;onCity:(id:string)=>void;visited:number;cards:number;onCollection:()=>void}){
 const [query,setQuery]=useState('');const city=cityById(cityId),spots=placesInCity(cityId);
 const matched=cities.filter(c=>[c.name,c.english,c.country,...placesInCity(c.id).flatMap(p=>[p.name,p.english])].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 return <section className="discovery-header">
  <div className="discovery-heading"><div><p className="eyebrow">YOUR NEXT LITTLE ADVENTURE</p><h1>下一站，想去哪里？</h1><p>走进一座城，带回一张属于你的明信片。</p></div><button className="travel-pass" onClick={onCollection}><BookOpen size={22}/><span><strong>{visited} 个足迹 · {cards} 张收藏</strong><small>打开我的旅行册 <ArrowUpRight size={13}/></small></span></button></div>
  <div className="destination-search"><Search size={21}/><input aria-label="搜索城市或景点" placeholder="搜索城市或景点，例如 东京、浅草寺" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="清除目的地搜索">清除</button>}<span>{cities.length} 座城市等你探索</span></div>
  <div className="destination-row-heading"><h2>{query?'找到这些目的地':'寻找下一段旅程'}</h2><span>{query?`${matched.length} 个城市`:'向右滑动，看看更远的地方'}</span></div>
  <div className="destination-rail" aria-label="选择目的地城市">{matched.map(c=><button key={c.id} aria-pressed={c.id===cityId} className={'destination-tile '+(c.id===cityId?'chosen':'')} onClick={()=>{onCity(c.id);setQuery('');}}><img loading="lazy" decoding="async" src={placesInCity(c.id)[0].image} alt=""/><span><strong>{c.name}</strong><small>{c.english}</small></span>{c.id===cityId&&<i aria-hidden="true">✓</i>}</button>)}</div>
  {!matched.length&&<p className="destination-empty">暂时没有这个目的地。试试其他城市，或清除搜索查看全部。</p>}
  <div className="destination-hero"><img decoding="async" src={spots[0].image} alt={`${city.name}旅行插画`}/><div className="destination-hero-copy"><span className="destination-badge"><MapPin size={13}/>{city.country} · 城市漫游</span><h2>{city.name}<span>{city.english}</span></h2><p>{spots.length} 个精选地点，{spots.length*3} 张风景。<br/>把路过的美好，装进你的旅册。</p><div><Compass size={16}/><span>从一场轻松的散步开始</span></div></div><span className="hero-edition">漫邮目的地 / {String(cities.findIndex(c=>c.id===cityId)+1).padStart(2,'0')}</span></div>
  <p className="discovery-total">已开放 {cities.length} 个城市 · {places.length} 个地点 · 每一次抵达，都值得纪念</p>
 </section>;
}
