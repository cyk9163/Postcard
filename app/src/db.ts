import {newTemplateVersion} from './photoSlots.ts';
import {pointsEarned,rewards as rewardCatalog,type Walk,type Reward} from './journey.ts';
import {openDB} from 'idb';
import {categories, templateId,placeById,cityById,cityIdOf} from './content.ts';
import type {Visit, Postcard, Backup} from './domain.ts';
import {findSticker,autoComposition,planTrip,validateSticker,type Sticker,type PetTrip,type StoredLetter,type Letter} from './companions.ts';
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,v[k]])):v);
export const databaseAccount=typeof localStorage==='undefined'?'':localStorage.getItem('manyou-account')??'';
function openPersistent(){return openDB(databaseAccount?'postcard-user-'+databaseAccount:'postcard-local',3,{upgrade(db,old){
 if(old<1){
 const visits=db.createObjectStore('visits',{keyPath:'id'}); visits.createIndex('requestId','requestId',{unique:true});
 db.createObjectStore('cards',{keyPath:'id'}); db.createObjectStore('unlocks',{keyPath:'id'}); db.createObjectStore('settings');
 }if(old<2){db.createObjectStore('assets',{keyPath:'id'});db.createObjectStore('trips',{keyPath:'id'});db.createObjectStore('letters',{keyPath:'id'});}if(old<3){db.createObjectStore('walks',{keyPath:'id'});db.createObjectStore('rewards',{keyPath:'id'});}
}});}
export let isGuestMode=false;
const changeListeners=new Set<()=>void>();
export let localChangeVersion=0;
export function onLocalChange(listener:()=>void){changeListeners.add(listener);return ()=>{changeListeners.delete(listener);};}
function changed(){if(isGuestMode)return;localChangeVersion++;for(const listener of changeListeners)listener();}

let dbPromise:ReturnType<typeof openPersistent>|undefined;
function getDB(){return dbPromise??=openPersistent();}
export async function startGuestMode(){
 const {memoryDatabase}=await import('./memory-db.ts');
 const memory=memoryDatabase();await memory;isGuestMode=true;dbPromise=memory;
}
export async function readAll(){const db=await getDB(); return {visits:await db.getAll('visits') as Visit[],cards:await db.getAll('cards') as Postcard[]};}
export async function saveCard(card:Postcard,visit?:Visit){
 if(card.origin==='pet'){const db=await getDB();const existing=await db.get('cards',card.id) as Postcard|undefined;if(existing?.origin!=='pet'||existing.tripId!==card.tripId)throw Error('宠物卡片只能从完成的旅程领取。');const tx=db.transaction(['cards','settings'],'readwrite');await tx.objectStore('cards').put(card);await tx.objectStore('settings').delete('draft');await tx.done;changed();return;}
 if(!visit)throw Error('缺少到访记录。');
 const db=await getDB();const tx=db.transaction(['visits','cards','unlocks','settings'],'readwrite');
 const existing=await tx.objectStore('visits').index('requestId').get(visit.requestId) as Visit|undefined;
 if(!existing) await tx.objectStore('visits').put(visit);
 await tx.objectStore('cards').put({...card,visitId:existing?.id??visit.id});
 for(const category of categories) await tx.objectStore('unlocks').put({id:templateId(visit.placeId,category.id),placeId:visit.placeId});
 await tx.objectStore('settings').delete('draft'); await tx.done;changed();
}
export async function deleteCard(id:string){const db=await getDB(); await db.delete('cards',id);changed();}
export async function setting<T>(key:string):Promise<T|undefined>{return (await getDB()).get('settings',key);}
export async function setSetting(key:string,value:unknown){await (await getDB()).put('settings',value,key);if(key==='autoSync')changed();}
export async function clearSetting(key:string){return (await getDB()).delete('settings',key);}
export async function readCompanions(){const db=await getDB();return {assets:await db.getAll('assets') as Sticker[],trips:await db.getAll('trips') as PetTrip[],letters:await db.getAll('letters') as StoredLetter[]};}
export async function addSticker(asset:Sticker){const db=await getDB();validateSticker(asset);const tx=db.transaction('assets','readwrite');if(await tx.store.count()>=30)throw Error('当前最多保存 30 张自定义动作图。');await tx.store.add(asset);await tx.done;changed();}
export async function startTrip(regionId:string,assetId:string,duration:number,now=Date.now()){
 const db=await getDB();const tx=db.transaction(['trips','assets'],'readwrite');const assets=await tx.objectStore('assets').getAll() as Sticker[];
 if(findSticker(assetId,assets)?.kind!=='pet')throw Error('请选择宠物。');
 if((await tx.objectStore('trips').getAll() as PetTrip[]).some(t=>t.claimedAt===undefined))throw Error('先迎接上一趟旅程归来的伙伴。');
 const trip=planTrip(regionId,assetId,now,duration);await tx.objectStore('trips').add(trip);await tx.done;changed();return trip;
}
export async function claimTrip(id:string,now=Date.now()){
 const db=await getDB();const assets=await db.getAll('assets') as Sticker[];const tx=db.transaction(['trips','cards'],'readwrite');const t=await tx.objectStore('trips').get(id) as PetTrip|undefined;
 if(!t)throw Error('找不到这趟旅程。');if(t.claimedAt!==undefined){await tx.done;changed();return 0;}if(now<t.returnAt)throw Error('伙伴还在路上，稍后再来看看。');
 const stamp=new Date(t.returnAt).toISOString(),date=new Intl.DateTimeFormat('en-CA',{timeZone:cityById(cityIdOf(placeById(t.rewards[0].placeId))).timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(t.returnAt);
 for(const r of t.rewards){const base=autoComposition(r.placeId,r.category,t.assetId,assets,newTemplateVersion(r.placeId));if(!base)throw Error('宠物素材缺失，无法制作见闻。');const actor=r.quirk==='closeup'?{...base,width:.7,x:.35}:base;await tx.objectStore('cards').add({id:r.id,visitId:'',placeId:r.placeId,category:r.category,caption:'替你去看了看，带一张风景回家。',date,createdAt:stamp,updatedAt:stamp,templateVersion:newTemplateVersion(r.placeId),origin:'pet',tripId:t.id,actor,quirk:r.quirk} satisfies Postcard);}
 await tx.objectStore('trips').put({...t,claimedAt:now});await tx.done;changed();return t.rewards.length;
}
export async function storeLetter(letter:Letter,box:'in'|'out'){const db=await getDB();const tx=db.transaction('letters','readwrite');if(await tx.store.get(letter.id)){await tx.done;changed();return false;}await tx.store.add({...letter,box});await tx.done;changed();return true;}
const syncStores=['visits','cards','assets','trips','letters','walks','rewards'] as const;
export async function exportBackup():Promise<Backup>{
 const db=await getDB(),tx=db.transaction([...syncStores],'readonly');
 const snapshot:any={format:'postcard-backup',version:2,exportedAt:new Date().toISOString()};
 for(const name of syncStores)snapshot[name]=await tx.objectStore(name).getAll();await tx.done;return snapshot;
}
// Read current edits and apply the merge within one transaction; no lost-write gap.
export async function applySyncedSnapshot(merge:(current:Backup)=>Backup,base:Backup,revision:number){
 const db=await getDB(),tx=db.transaction([...syncStores,'settings'],'readwrite');
 try{
 const current:any={format:'postcard-backup',version:2,exportedAt:new Date().toISOString()};
 for(const name of syncStores)current[name]=await tx.objectStore(name).getAll();
 const combined=merge(current);
 for(const name of syncStores){await tx.objectStore(name).clear();for(const item of combined[name]??[])await tx.objectStore(name).put(item);}
 await tx.objectStore('settings').put(base,'syncBase');await tx.objectStore('settings').put(Date.now(),'lastSync');await tx.objectStore('settings').put(revision,'syncRevision');
 await tx.done;return combined;
 }catch(error){try{tx.abort();}catch{}await tx.done.catch(()=>{});throw error;}
}
export async function importBackup(backup:Backup){
 const db=await getDB();
 // Fail before any writes if the same immutable asset ID contains different bytes.
 for(const a of backup.assets??[]){const existing=await db.get('assets',a.id) as Sticker|undefined;if(existing&&existing.src!==a.src)throw Error('角色素材编号冲突，请保留两份备份并联系处理。');}
 for(const t of backup.trips??[]){const existing=await db.get('trips',t.id) as PetTrip|undefined;if(existing&&(existing.assetId!==t.assetId||existing.regionId!==t.regionId||existing.departAt!==t.departAt||existing.returnAt!==t.returnAt||JSON.stringify(existing.rewards)!==JSON.stringify(t.rewards)))throw Error('同一趟旅程的记录发生冲突，未恢复任何内容。');}
 const tx=db.transaction(['visits','cards','unlocks','assets','trips','letters','walks','rewards'],'readwrite');let added=0;
 for(const a of backup.assets??[])await tx.objectStore('assets').put(a);
 for(const t of backup.trips??[]){const existing=await tx.objectStore('trips').get(t.id) as PetTrip|undefined;if(!existing)await tx.objectStore('trips').put(t);else if(existing.claimedAt===undefined&&t.claimedAt!==undefined)await tx.objectStore('trips').put(t);}
 for(const l of backup.letters??[])if(!await tx.objectStore('letters').get(l.id))await tx.objectStore('letters').put(l);
 for(const w of backup.walks??[])await tx.objectStore('walks').put(w);
 for(const r of backup.rewards??[])await tx.objectStore('rewards').put(r);
 const visitMap=new Map<string,string>();
 for(const v of backup.visits){
  const existing=await tx.objectStore('visits').get(v.id) as Visit|undefined;
  const byRequest=await tx.objectStore('visits').index('requestId').get(v.requestId) as Visit|undefined;
  if(existing&&canonical(existing)===canonical(v)){visitMap.set(v.id,existing.id);continue;}
  if(!existing&&byRequest&&byRequest.placeId===v.placeId&&byRequest.occurredAt===v.occurredAt&&byRequest.source===v.source){visitMap.set(v.id,byRequest.id);continue;}
  const incoming=(existing||byRequest)?{...v,id:crypto.randomUUID(),requestId:crypto.randomUUID()}:v;
  visitMap.set(v.id,incoming.id);await tx.objectStore('visits').put(incoming);
 }
 const currentCards=await tx.objectStore('cards').getAll() as Postcard[];
 for(const c of backup.cards){
  const incoming={...c,visitId:c.origin==='pet'?'':visitMap.get(c.visitId)!};
  const existing=await tx.objectStore('cards').get(c.id) as Postcard|undefined;
  if(existing&&(canonical(existing)===canonical(incoming)||currentCards.some(copy=>canonical({...copy,id:undefined})===canonical({...incoming,id:undefined}))))continue;
  const stored={...incoming,id:existing?crypto.randomUUID():c.id};await tx.objectStore('cards').put(stored);currentCards.push(stored);added++;
 }
 for(const v of backup.visits) for(const category of categories) await tx.objectStore('unlocks').put({id:templateId(v.placeId,category.id),placeId:v.placeId});
 await tx.done;changed(); return added;
}

export async function readJourney(){const db=await getDB();return {walks:await db.getAll('walks') as Walk[],rewards:await db.getAll('rewards') as Reward[]};}
export async function saveWalk(w:Walk){await (await getDB()).put('walks',w);changed();}
export async function unlockReward(id:string){const db=await getDB();const tx=db.transaction(['visits','walks','rewards'],'readwrite'),owned=await tx.objectStore('rewards').getAll() as Reward[];if(owned.some(r=>r.id===id))return;const item=rewardCatalog.find(r=>r.id===id);if(!item)throw Error('找不到这个奖励');const earned=pointsEarned(await tx.objectStore('visits').getAll(),await tx.objectStore('walks').getAll()),spent=owned.reduce((n,r)=>n+(rewardCatalog.find(x=>x.id===r.id)?.cost??0),0);if(earned-spent<item.cost)throw Error('积分还不够，慢慢探索就好');await tx.objectStore('rewards').add({id,at:Date.now()});await tx.done;changed();}
export async function replaceFromSync(backup:Backup){const db=await getDB();const names=['visits','cards','assets','trips','letters','walks','rewards'] as const;const tx=db.transaction([...names],'readwrite');for(const name of names){await tx.objectStore(name).clear();for(const v of backup[name]??[])await tx.objectStore(name).put(v);}await tx.done;changed();}
