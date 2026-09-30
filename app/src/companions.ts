import {cardLayout,type PositionTag} from './layout.ts';
import {photoSlot} from './photoSlots.ts';
import {places,cities,placesInCity,type Category} from './content.ts';
export type ActorKind='human'|'pet';
export interface Sticker {id:string;characterId:string;name:string;pose:string;kind:ActorKind;src:string;custom?:boolean;positionTag?:PositionTag;}
export interface Composition {assetId:string;x:number;y:number;width:number;flip:boolean;}
export type Quirk='normal'|'tilted'|'closeup';
export interface PetTrip {id:string;regionId:string;assetId:string;departAt:number;returnAt:number;claimedAt?:number;rewards:{id:string;placeId:string;quirk:Quirk;category:Category}[];}
export interface Letter {format:'manyou-letter';version:1;id:string;threadId:string;inReplyTo?:string;sender:string;recipient:string;message:string;createdAt:number;deliverAt:number;attachments:{name:string;image:string}[];}
export interface StoredLetter extends Letter {box:'in'|'out';}
const identities=[['mira','小满','human'],['leo','阿澈','human'],['iris','青禾','human'],['noah','木川','human'],['luna','小夏','human'],['kai','阿岚','human'],['mikan','蜜柑','pet'],['mugi','麦麦','pet']] as const;
export const builtInStickers:Sticker[]=identities.flatMap(([id,name,kind])=>['stand','wave'].map(pose=>({id:`${id}-${pose}-v1`,characterId:id,name,kind,pose:pose==='stand'?'静静相伴':kind==='pet'?'抬爪招呼':'挥手问好',positionTag:pose==='wave'?'right':'any',src:`/companions/v1/${id}-${pose}.webp`})));
builtInStickers.push(...identities.filter(x=>x[2]==='human').flatMap(([id,name,kind])=>['camera','sit'].map(pose=>({id:`${id}-${pose}-v2`,characterId:id,name,kind,pose:pose==='camera'?'举起相机':'坐着歇歇',positionTag:(pose==='camera'?'left':'any') as PositionTag,src:`/companions/v2/${id}-${pose}.webp`}))));
export const regions=[{id:'centre',name:'城市街角',description:'车站、广场和图书馆',placeIds:['flinders','federation','library']},{id:'gardens',name:'花园与绿地',description:'植物园与国王公园',placeIds:['gardens','shrine']}];
regions.push({id:'heritage',name:'历史与艺术',description:'博物馆、展览馆与城市建筑',placeIds:['museum','exhibition','carlton','ngv','acmi','market','cathedral','patrick','fitzroy','parliament','townhall','cooks']},{id:'waterside',name:'水边散步',description:'码头、湖泊与港区',placeIds:['stkilda','albert','docklands']});
regions.forEach(r=>{r.name='墨尔本 · '+r.name;});
regions.push(...cities.filter(c=>c.id!=='melbourne').map(c=>({id:'city-'+c.id,name:c.name,description:'城市地标漫游',placeIds:placesInCity(c.id).map(p=>p.id)})));
export const defaultComposition=(assetId:string):Composition=>({assetId,x:.27,y:1,width:.32,flip:false});
export function findSticker(id:string,custom:Sticker[]=[]){return builtInStickers.find(s=>s.id===id)??custom.find(s=>s.id===id);}
export function autoComposition(placeId:string,category:Category,assetId:string,assets:Sticker[]=[],templateVersion=2):Composition|undefined {
 const sticker=findSticker(assetId,assets);if(!sticker)return undefined;
 const slot=photoSlot(placeId,category,templateVersion);if(slot)return {assetId,x:slot.x,y:slot.bottom,width:.2,flip:false};
 const layout=cardLayout(placeId,category);if(sticker.kind==='human'&&!layout.human)return undefined;
 const anchor=layout.anchors.find(a=>a.tag===sticker.positionTag)??layout.anchors[0];
 const seated=assetId.includes('-sit-');
 return {assetId,x:anchor.x,y:anchor.y,width:sticker.kind==='pet'?.22:seated?.19:anchor.width,flip:false};
}
const num=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function validComposition(v:Composition){return v&&typeof v.assetId==='string'&&num(v.x,0,1)&&num(v.y,0,1)&&num(v.width,.12,.8)&&typeof v.flip==='boolean';}
export function validImage(src:unknown,max=1_600_000):src is string{return typeof src==='string'&&src.length<=max&&/^data:image\/(png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src);}
export function validateSticker(s:Sticker){if(!s||!/^custom-[a-zA-Z0-9-]{1,100}$/.test(s.id)||!s.characterId?.startsWith('custom-')||typeof s.name!=='string'||s.name.length>30||!s.name.trim()||typeof s.pose!=='string'||s.pose.length>30||!['human','pet'].includes(s.kind)||!validImage(s.src)||(s.positionTag!==undefined&&!['left','center','right','any'].includes(s.positionTag)))throw Error('自定义角色素材格式不正确。');return {id:s.id,characterId:s.characterId,name:s.name,pose:s.pose,kind:s.kind,src:s.src,...(s.positionTag?{positionTag:s.positionTag}:{}),custom:true} as Sticker;}
export function planTrip(regionId:string,assetId:string,now=Date.now(),duration=2*3600000,random=Math.random):PetTrip{
 const region=regions.find(r=>r.id===regionId);if(!region)throw Error('请选择可探索区域。');
 if(!num(duration,60000,24*3600000))throw Error('出游时长不正确。');
 const ids=[...region.placeIds];for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
 const count=random()<.5?1:2;
 return {id:crypto.randomUUID(),regionId,assetId,departAt:now,returnAt:now+duration,rewards:ids.slice(0,count).map(placeId=>({id:crypto.randomUUID(),placeId,quirk:(['normal','tilted','closeup']as const)[Math.floor(random()*3)],category:'landmark'}))};
}
export function validateTrip(t:PetTrip){const r=regions.find(r=>r.id===t?.regionId);if(!r||typeof t.id!=='string'||t.id.length>150||typeof t.assetId!=='string'||!num(t.departAt,0,9e15)||!num(t.returnAt,t.departAt+60000,t.departAt+86400000)||!Array.isArray(t.rewards)||t.rewards.length<1||t.rewards.length>2||new Set(t.rewards.map(x=>x.id)).size!==t.rewards.length||t.rewards.some(x=>!x||typeof x.id!=='string'||x.id.length>150||!r.placeIds.includes(x.placeId)||!['normal','tilted','closeup'].includes(x.quirk)||x.category!=='landmark')||(t.claimedAt!==undefined&&!num(t.claimedAt,t.returnAt,9e15)))throw Error('宠物旅程格式不正确。');return t;}
export function parseLetter(text:string):Letter{
 if(text.length>4_000_000)throw Error('来信文件过大。');const l=JSON.parse(text);
 const short=(v:unknown,max:number)=>typeof v==='string'&&v.length>0&&v.length<=max;
 if(l?.format!=='manyou-letter'||l.version!==1||!short(l.id,150)||!short(l.threadId,150)||(l.inReplyTo!==undefined&&!short(l.inReplyTo,150))||!short(l.sender,30)||!short(l.recipient,30)||typeof l.message!=='string'||[...l.message].length>240||!num(l.createdAt,0,9e15)||!num(l.deliverAt,l.createdAt+60000,l.createdAt+86400000)||!Array.isArray(l.attachments)||l.attachments.length<1||l.attachments.length>2||l.attachments.some((a:{name:unknown;image:unknown})=>!a||!short(a.name,60)||!validImage(a.image)))throw Error('不是支持的明信片来信文件。');
 return {format:l.format,version:1,id:l.id,threadId:l.threadId,...(l.inReplyTo?{inReplyTo:l.inReplyTo}:{}),sender:l.sender,recipient:l.recipient,message:l.message,createdAt:l.createdAt,deliverAt:l.deliverAt,attachments:l.attachments.map((a:{name:string;image:string})=>({name:a.name,image:a.image}))};
}
export const quirkNames:Record<Quirk,string>={normal:'认真拍的一张',tilted:'镜头有点歪',closeup:'不小心凑太近'};
export function remainingTime(at:number,now=Date.now()){const mins=Math.max(0,Math.ceil((at-now)/60000));return mins>=60?`${Math.floor(mins/60)} 小时 ${mins%60} 分钟`:`${mins} 分钟`;}
