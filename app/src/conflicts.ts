import {parseBackup,type Backup} from './domain.ts';
export const stores=['visits','cards','assets','trips','letters','walks','rewards'] as const;
export type Store=typeof stores[number];export type Side='local'|'remote';
export type RecordValue={id:string;[key:string]:unknown};
export interface Difference {key:string;store:Store;id:string;local?:RecordValue;remote?:RecordValue;conflict:boolean;automatic?:Side;}
export const canonical=(value:unknown)=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,v[k]])):v);
export const equal=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
export const records=(b:Backup|null,key:Store)=>(b?.[key]??[]) as unknown as RecordValue[];
export function differences(base:Backup|null,local:Backup,remote:Backup):Difference[]{
 const rows:Difference[]=[];
 for(const store of stores){const B=new Map(records(base,store).map(x=>[x.id,x])),L=new Map(records(local,store).map(x=>[x.id,x])),R=new Map(records(remote,store).map(x=>[x.id,x]));
  for(const id of new Set([...B.keys(),...L.keys(),...R.keys()])){const b=B.get(id),l=L.get(id),r=R.get(id);if(equal(l,r))continue;
   const automatic:Side|undefined=equal(l,b)?'remote':equal(r,b)?'local':!base&&!l?'remote':!base&&!r?'local':undefined;
   rows.push({key:JSON.stringify([store,id]),store,id,local:l,remote:r,conflict:!automatic,automatic});
  }
 }return rows;
}
export function mergeSnapshots(base:Backup|null,local:Backup,remote:Backup,choices:Record<string,Side>={}):Backup{
 const rows=differences(base,local,remote),out={...local,exportedAt:new Date().toISOString()};
 for(const store of stores){const merged=new Map(records(local,store).map(x=>[x.id,x]));
  for(const row of rows.filter(r=>r.store===store)){const side=choices[row.key]??row.automatic;if(side!=='local'&&side!=='remote')throw Error('两台设备修改了同一条记录，请到小屋设置逐条查看差异。');const value=row[side];if(value)merged.set(row.id,value);else merged.delete(row.id);}
  (out as any)[store]=[...merged.values()];
 }return parseBackup(JSON.stringify(out));
}
