import {exportBackup,applySyncedSnapshot,setting,databaseAccount,isGuestMode,onLocalChange,localChangeVersion,setSetting} from './db.ts';
import {parseBackup,type Backup} from './domain.ts';
import {equal,mergeSnapshots,differences,type Side} from './conflicts.ts';
export {mergeSnapshots} from './conflicts.ts';
export interface CloudUser{id:string;username:string;name:string;randomMail:boolean;recovery?:string}
export class ApiError extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status;}}
export async function api<T=any>(path:string,data?:unknown):Promise<T>{
 if(isGuestMode)throw new ApiError(401,'游客试用不能使用云端功能，请先登录。');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{const r=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',signal:controller.signal,headers:{'X-Manyou-Account':databaseAccount,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 let b;try{b=await r.json();}catch{throw new ApiError(r.status,'云端服务暂时不可用');}if(!r.ok)throw new ApiError(r.status,b.error??'请求未完成');return b;
 }catch(e){if(controller.signal.aborted)throw new ApiError(408,'连接云端超时，本机记录仍保留，请重试。');throw e;}finally{clearTimeout(timer);}
}

export function sameSnapshot(a:Backup,b:Backup){
 const normalize=(snapshot:Backup)=>Object.fromEntries(['visits','cards','assets','trips','letters','walks','rewards'].map(key=>[key,[...((snapshot as any)[key]??[])].sort((x,y)=>x.id<y.id?-1:x.id>y.id?1:0)]));
 return equal(normalize(a),normalize(b));
}
export type SyncState={phase:'checking'|'local'|'syncing'|'synced'|'error';message:string;last:number};
let state:SyncState={phase:'checking',message:'正在检查保存状态…',last:0};
const listeners=new Set<()=>void>();
export const syncState=()=>state;
export function subscribeSync(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}
function publish(phase:SyncState['phase'],message:string,last=state.last){state={phase,message,last};for(const listener of listeners)listener();}
let pending:Promise<void>|null=null;
onLocalChange(()=>{if(!pending)publish('local','已存本机，等待同步');});
export async function inspectSync(){if(pending)return;const version=localChangeVersion;const [current,base,last]=await Promise.all([exportBackup(),setting<Backup>('syncBase'),setting<number>('lastSync')]);if(pending||version!==localChangeVersion)return;publish(base&&sameSnapshot(current,base)?'synced':'local',base&&sameSnapshot(current,base)?'已同步':'已存本机，等待同步',last??0);}
export function synchronize(){if(pending)return pending;if(isGuestMode)return Promise.reject(new ApiError(401,'游客不能同步'));
 publish('syncing','正在同步，本机记录已保存');
 pending=(async()=>{
 const user=await api<CloudUser>('me');if(databaseAccount!==user.id)throw Error('账号已在其他标签页切换，请刷新页面后再同步。');
 const local=await exportBackup(),base=await setting<Backup>('syncBase'),remote=await api<{revision:number;snapshot:Backup|null}>('sync');
 const merged=remote.snapshot?mergeSnapshots(base??null,local,parseBackup(JSON.stringify(remote.snapshot))):local;
 const result=remote.snapshot&&sameSnapshot(merged,remote.snapshot)?{revision:remote.revision}:await api<{revision:number}>('sync',{revision:remote.revision,snapshot:merged});
 let appliedVersion=localChangeVersion;
 const combined=await applySyncedSnapshot(current=>{appliedVersion=localChangeVersion;return mergeSnapshots(local,current,merged);},merged,result.revision);
 const dirty=appliedVersion!==localChangeVersion||!sameSnapshot(combined,merged);
 publish(dirty?'local':'synced',dirty?'新修改已存本机，等待下一次同步':'已同步',Date.now());
 })().catch(e=>{publish('error',e instanceof Error?e.message:'同步未完成，本机记录仍保留');throw e;}).finally(()=>{pending=null;});return pending;
}

export interface ConflictReview {account:string;base:Backup|null;local:Backup;remote:Backup;revision:number;}
export async function loadConflictReview():Promise<ConflictReview>{
 if(pending)await pending.catch(()=>{});
 const user=await api<CloudUser>('me');if(user.id!==databaseAccount)throw Error('账号已切换，请刷新。');
 const [local,base,remote]=await Promise.all([exportBackup(),setting<Backup>('syncBase'),api<{revision:number;snapshot:Backup|null}>('sync')]);
 if(!remote.snapshot)throw Error('云端还没有记录，无需处理冲突，请直接同步。');
 return {account:user.id,local,base:base??null,remote:parseBackup(JSON.stringify(remote.snapshot)),revision:remote.revision};
}
export function applyConflictReview(review:ConflictReview,choices:Record<string,Side>){
 if(pending)return Promise.reject(Error('正在同步，请稍后再应用选择。'));
 pending=(async()=>{
  publish('syncing','正在检查差异并保存你的选择');
  const user=await api<CloudUser>('me');if(user.id!==review.account||databaseAccount!==review.account)throw Error('账号已切换，请刷新后重新查看差异。');
  const [current,base,remote]=await Promise.all([exportBackup(),setting<Backup>('syncBase'),api<{revision:number;snapshot:Backup|null}>('sync')]);
  if(!sameSnapshot(current,review.local)||!equal(base??null,review.base)||remote.revision!==review.revision||!remote.snapshot||!sameSnapshot(remote.snapshot,review.remote))throw Error('记录在查看期间有了新变化，请重新加载差异，再确认选择。');
  const rows=differences(review.base,review.local,review.remote);
  if(rows.some(r=>r.conflict&&!choices[r.key]))throw Error('请为每条冲突选择保留的版本。');
  let merged:Backup;try{merged=mergeSnapshots(review.base,review.local,review.remote,choices);}catch(e){throw Error('所选记录的关联不一致，请展开其他差异，检查到访、卡片、角色及旅程是否配套。'+(e as Error).message);}
  // Durable safety copy is written BEFORE uploading or replacing any record.
  await setSetting('lastConflictBackup',{format:'manyou-conflict-backup',version:1,createdAt:new Date().toISOString(),account:review.account,local:review.local,remote:review.remote});
  const result=sameSnapshot(merged,review.remote)?{revision:remote.revision}:await api<{revision:number}>('sync',{revision:remote.revision,snapshot:merged});
  let appliedVersion=localChangeVersion;
  const combined=await applySyncedSnapshot(latest=>{appliedVersion=localChangeVersion;return mergeSnapshots(review.local,latest,merged);},merged,result.revision);
  const dirty=appliedVersion!==localChangeVersion||!sameSnapshot(combined,merged);
  publish(dirty?'local':'synced',dirty?'新修改已存本机，等待下一次同步':'已同步',Date.now());
 })().catch(e=>{publish('error',(e as Error).message);throw e;}).finally(()=>{pending=null;});
 return pending;
}
