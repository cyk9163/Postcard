import {expandedPlaces} from './expanded-content.ts';
import {worldPlaces} from './world-content.ts';
import {photoSlot} from './photoSlots.ts';
export {cities,cityById} from './cities.ts';
export type Category = 'landmark' | 'atmosphere' | 'detail';
export interface Place { id:string; cityId?:string; name:string; english:string; lat:number; lng:number; radius:number; area:string; description:string; accent:string; image:string;credit?:string; }
export const categories: {id:Category; name:string; subtitle:string}[] = [
  {id:'landmark',name:'城市地标',subtitle:'把这一眼，留在纸上'},
  {id:'atmosphere',name:'散步时分',subtitle:'收藏此刻的光与颜色'},
  {id:'detail',name:'小小发现',subtitle:'记住旅途里的小事'},
];
export const places:Place[] = [
  {id:'flinders',name:'弗林德斯街车站',english:'Flinders Street Station',lat:-37.818078,lng:144.966811,radius:250,area:'CITY CENTRE',description:'从车站钟表下开始，把今天的散步留在一张卡片里。',accent:'#a95634',image:'/cards/preview-1/flinders.webp'},
  {id:'federation',name:'联邦广场',english:'Federation Square',lat:-37.817797,lng:144.968714,radius:220,area:'CITY CENTRE',description:'停在广场边，写下今天遇见的一点新鲜事。',accent:'#9a6e36',image:'/cards/preview-1/federation.webp'},
  {id:'gardens',name:'墨尔本皇家植物园',english:'Royal Botanic Gardens',lat:-37.830361,lng:144.979611,radius:650,area:'SOUTH YARRA',description:'慢一点走，让树影和水边的风成为这次旅行的注脚。',accent:'#45725a',image:'/cards/preview-1/gardens.webp'},
  {id:'shrine',name:'战争纪念馆',english:'Shrine of Remembrance',lat:-37.830556,lng:144.973444,radius:300,area:'KINGS DOMAIN',description:'留下一张安静的纪念，也留一点时间回望。',accent:'#8b755b',image:'/cards/preview-1/shrine.webp'},
  {id:'library',name:'维多利亚州立图书馆',english:'State Library Victoria',lat:-37.8098,lng:144.965,radius:200,area:'CITY CENTRE',description:'在城市的阅读角落，记录属于你的一页。',accent:'#627888',image:'/cards/preview-1/library.webp'},
];
places.push(...expandedPlaces);
places.push(...worldPlaces);
export const legacyPlaceImages:Record<string,string>=Object.fromEntries(places.map(p=>[p.id,p.image]));
for(const p of places){const slot=photoSlot(p.id,'landmark',3);if(slot)p.image=slot.src;}
export const cityIdOf=(place:Place)=>place.cityId??'melbourne';
export const placesInCity=(cityId:string)=>places.filter(p=>cityIdOf(p)===cityId);
export const contentVersion = 'world-v1';
export function placeById(id:string) { const p=places.find(p=>p.id===id); if(!p) throw Error('找不到这个地点'); return p; }
export function templateId(placeId:string,category:Category) { return `${placeId}:${category}:v1`; }
