import {IDBFactory} from 'fake-indexeddb';
import type {IDBPDatabase} from 'idb';
const result=<T>(request:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
// The factory owns in-memory stores only. Do not replace the browser's native
// IndexedDB globals: existing account databases must remain untouched.
export async function memoryDatabase():Promise<IDBPDatabase>{
 const factory=new IDBFactory(),request=factory.open('manyou-memory-trial',1);
 request.onupgradeneeded=()=>{const db=request.result;for(const name of ['visits','cards','unlocks','assets','trips','letters','walks','rewards']){const store=db.createObjectStore(name,{keyPath:'id'});if(name==='visits')store.createIndex('requestId','requestId',{unique:true});}db.createObjectStore('settings');};
 const db=await result(request);
 function store(raw:any):any{return new Proxy(raw,{get(target,key){if(key==='index')return (name:string)=>store(target.index(name));const v=target[key];return typeof v==='function'?(...args:unknown[])=>result(v.apply(target,args)):v;}});}
 function transaction(names:string|string[],mode:IDBTransactionMode='readonly'){
  const raw=db.transaction(names,mode),done=new Promise<void>((resolve,reject)=>{raw.oncomplete=()=>resolve();raw.onabort=raw.onerror=()=>reject(raw.error??Error('试用操作未完成'));});
  // Callers sometimes finish a read-only branch without awaiting done.
  void done.catch(()=>{});
  return {done,objectStore:(name:string)=>store(raw.objectStore(name)),store:raw.objectStoreNames.length===1?store(raw.objectStore(raw.objectStoreNames[0])):undefined};
 }
 const adapter:any={transaction,close:()=>db.close()};
 for(const method of ['get','getAll','put','add','delete','clear','count'])adapter[method]=async(name:string,...args:unknown[])=>{const tx=transaction(name,['get','getAll','count'].includes(method)?'readonly':'readwrite');const value=await tx.store[method](...args);await tx.done;return value;};
 return adapter as IDBPDatabase;
}
