import {validateWalk,rewards,pointsEarned,type Walk,type Reward} from './journey.ts';
import {places, cities, categories, type Category} from './content.ts';
import {findSticker,validComposition,validateSticker,validateTrip,parseLetter,type Composition,type Quirk,type Sticker,type PetTrip,type StoredLetter} from './companions.ts';
export interface Visit {id:string; requestId:string; placeId:string; occurredAt:string; timezone:string; source:'gps'|'manual';}
export interface Postcard {id:string; visitId:string; placeId:string; category:Category; caption:string; date:string; createdAt:string; updatedAt:string; templateVersion:1|2|3;style?:'sunset'|'vintage';sceneTheme?:'night'|'rain';origin?:'pet';tripId?:string;actor?:Composition;quirk?:Quirk;}
export interface Backup {format:'postcard-backup';version:1|2;exportedAt:string;visits:Visit[];cards:Postcard[];assets?:Sticker[];trips?:PetTrip[];letters?:StoredLetter[];walks?:Walk[];rewards?:Reward[];}
export function distanceMeters(lat1:number,lng1:number,lat2:number,lng2:number) {
 const rad=Math.PI/180; const a=Math.sin((lat2-lat1)*rad/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin((lng2-lng1)*rad/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
}
export function checkPosition(place:{lat:number;lng:number;radius:number},fix:{lat:number;lng:number;accuracy:number;timestamp:number},now=Date.now()) {
 if(!Number.isFinite(fix.lat)||!Number.isFinite(fix.lng)||Math.abs(fix.lat)>90||Math.abs(fix.lng)>180) return {ok:false,message:'位置数据无效，请重新定位。'};
 if(!Number.isFinite(fix.timestamp)||now-fix.timestamp>30000||fix.timestamp>now+5000) return {ok:false,message:'位置已过期，请重新定位。'};
 if(!Number.isFinite(fix.accuracy)||fix.accuracy<0||fix.accuracy>100) return {ok:false,message:'目前定位不够准确。可到开阔处重试，或手动记录。'};
 const distance=distanceMeters(place.lat,place.lng,fix.lat,fix.lng);
 return distance<=place.radius ? {ok:true,message:'已到达',distance} : {ok:false,message:`距离地点约 ${distance<1000?Math.round(distance)+' 米':(distance/1000).toFixed(1)+' 公里'}。可到达后重试，或手动记录。`,distance};
}
export function localDate(timeZone='Australia/Melbourne',date=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function isDate(value:unknown):value is string {return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<150;
const timestamp=(v:unknown):v is string=>typeof v==='string'&&v.length<50&&Number.isFinite(Date.parse(v));
export function parseBackup(text:string):Backup {
 if(text.length>40_000_000) throw Error('备份超过 40 MB，请检查文件。');
 const data=JSON.parse(text);
 if(data?.format!=='postcard-backup'||![1,2].includes(data.version)||!Array.isArray(data.visits)||!Array.isArray(data.cards)) throw Error('不是支持的漫邮备份文件。');
 if(data.version===2&&(!Array.isArray(data.assets)||!Array.isArray(data.trips)||!Array.isArray(data.letters)))throw Error('新版备份缺少角色、旅程或信箱数据。');
 const assets:Sticker[]=data.version===2&&Array.isArray(data.assets)?data.assets.map(validateSticker):[];
 const trips:PetTrip[]=data.version===2&&Array.isArray(data.trips)?data.trips.map(validateTrip):[];
 const letters:StoredLetter[]=data.version===2&&Array.isArray(data.letters)?data.letters.map((l:StoredLetter)=>{if(!['in','out'].includes(l.box))throw Error('信箱数据不正确。');return {...parseLetter(JSON.stringify(l)),box:l.box};}):[];
 if(assets.length>30||trips.length>10000||letters.length>1000||[assets,trips,letters].some(items=>new Set(items.map(x=>x.id)).size!==items.length))throw Error('备份包含重复或过多记录。');
 for(const t of trips)if(findSticker(t.assetId,assets)?.kind!=='pet')throw Error('宠物旅程缺少对应素材。');
 if(data.visits.length>10000||data.cards.length>10000) throw Error('备份记录数量过多。');
 const visitIds=new Set<string>(); const cardIds=new Set<string>();
 const visits:Visit[]=data.visits.map((v:Visit)=>{
  if(!id(v.id)||visitIds.has(v.id)||!id(v.requestId)||!places.some(p=>p.id===v.placeId)||!timestamp(v.occurredAt)||!cities.some(c=>c.timezone===v.timezone)||!['gps','manual'].includes(v.source)) throw Error('旅行记录格式有误或包含未支持地点。');
  visitIds.add(v.id); return {id:v.id,requestId:v.requestId,placeId:v.placeId,occurredAt:v.occurredAt,timezone:v.timezone,source:v.source};
 });
 const walks:Walk[]=(data.walks??[]).map(validateWalk),earned:Reward[]=data.rewards??[];if(walks.length>1000||earned.length>rewards.length||new Set(earned.map(x=>x.id)).size!==earned.length||earned.some(x=>!rewards.some(r=>r.id===x.id)||!Number.isFinite(x.at)))throw Error('旅途奖励数据不正确');
 if(earned.reduce((n,x)=>n+(rewards.find(r=>r.id===x.id)?.cost??0),0)>pointsEarned(visits,walks))throw Error('积分余额冲突，请保留备份并选择同步版本');
 const cards:Postcard[]=data.cards.map((c:Postcard)=>{
  const pet=data.version===2&&c.origin==='pet';
  if(!id(c.id)||cardIds.has(c.id)||(!pet&&(!visitIds.has(c.visitId)||visits.find(v=>v.id===c.visitId)?.placeId!==c.placeId))||!places.some(p=>p.id===c.placeId)||!categories.some(t=>t.id===c.category)||typeof c.caption!=='string'||[...c.caption].length>120||!isDate(c.date)||!timestamp(c.createdAt)||!timestamp(c.updatedAt)||![1,2,3].includes(c.templateVersion)) throw Error('明信片数据不完整或版本不兼容。');
  if(c.style&&!['sunset','vintage'].includes(c.style))throw Error('背景风格不正确');
  if(c.sceneTheme!==undefined&&(!['night','rain'].includes(c.sceneTheme)||c.templateVersion!==3||c.category!=='landmark'))throw Error('卡片天气场景不正确');
  if(c.actor&&(!validComposition(c.actor)||findSticker(c.actor.assetId,assets)?.kind!==(pet?'pet':'human')))throw Error('明信片角色素材缺失或类型不正确。');
  if(c.quirk&&!['normal','tilted','closeup'].includes(c.quirk))throw Error('镜头类型不正确。');
  if(pet&&(!c.actor||c.visitId!==''||!trips.some(t=>t.id===c.tripId&&t.claimedAt!==undefined&&t.rewards.some(r=>r.placeId===c.placeId))))throw Error('宠物卡片缺少已领取的旅程。');
  cardIds.add(c.id); return {id:c.id,visitId:c.visitId,placeId:c.placeId,category:c.category,caption:c.caption,date:c.date,createdAt:c.createdAt,updatedAt:c.updatedAt,templateVersion:c.templateVersion,...(c.style?{style:c.style}:{}),...(c.sceneTheme?{sceneTheme:c.sceneTheme}:{}),...(c.actor?{actor:c.actor}:{}),...(pet?{origin:'pet' as const,tripId:c.tripId,quirk:c.quirk??'normal'}:{})};
 });
 return {format:'postcard-backup',version:data.version,exportedAt:timestamp(data.exportedAt)?data.exportedAt:new Date().toISOString(),visits,cards,...(data.version===2?{assets,trips,letters,walks,rewards:earned}:{})};
}
