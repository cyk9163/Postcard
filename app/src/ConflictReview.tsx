import {useEffect,useState} from 'react';
import {loadConflictReview,applyConflictReview,type ConflictReview as Review} from './sync';
import {differences,equal,type Difference,type RecordValue,type Side} from './conflicts';
import {setting} from './db';import {placeById,categories} from './content';import {findSticker,regions} from './companions';import type {Backup} from './domain';
import './conflicts.css';
const names={cards:'明信片',visits:'到访记录',assets:'角色动作',trips:'宠物旅行',letters:'往来信件',walks:'散步记录',rewards:'旅行奖励'};
const labels:Record<string,string>={caption:'留言',date:'记录日期',updatedAt:'修改时间',createdAt:'创建时间',occurredAt:'到访时间',placeId:'地点',category:'卡面',actor:'合影',name:'名字',pose:'动作',src:'角色图片',positionTag:'站位偏好',regionId:'旅行区域',assetId:'旅伴',departAt:'出发时间',returnAt:'归来时间',claimedAt:'领取时间',rewards:'带回的纪念',sender:'寄信人',recipient:'收信人',message:'信件正文',attachments:'随信图片',deliverAt:'送达时间',box:'信箱',points:'沿途位置',startedAt:'开始时间',endedAt:'结束时间',at:'获得时间',source:'记录方式',timezone:'当地时区',style:'背景风格',sceneTheme:'场景主题',quirk:'镜头',templateVersion:'卡面版本',characterId:'所属角色',custom:'自制角色',origin:'纪念来源',visitId:'关联到访',tripId:'关联旅程',requestId:'记录标记',threadId:'通信往来',inReplyTo:'回复对象'};
function title(row:Difference){const r=row.local??row.remote;try{return r?.placeId?placeById(String(r.placeId)).name:String(r?.name??r?.sender??names[row.store]);}catch{return names[row.store];}}
function show(key:string,v:unknown,b:Backup):string{
 if(v===undefined)return '未设置';if(v===null)return '无';
 if(key==='placeId'){try{return placeById(String(v)).name;}catch{return String(v);}}
 if(key==='category')return categories.find(c=>c.id===v)?.name??String(v);
 if(key==='visitId'){const visit=b.visits.find(x=>x.id===v);return visit?`${placeById(visit.placeId).name} · ${new Date(visit.occurredAt).toLocaleString()}`:'没有关联到访';}
 if(key==='tripId'){const trip=b.trips?.find(x=>x.id===v);return trip?`${regions.find(r=>r.id===trip.regionId)?.name??'宠物旅行'} · ${new Date(trip.departAt).toLocaleString()}`:'没有关联旅程';}
 if(key==='regionId')return regions.find(r=>r.id===v)?.name??String(v);
 if(key==='actor'&&v&&typeof v==='object'){const a=v as any;return `${findSticker(a.assetId,b.assets)?.name??'自制角色'} · ${findSticker(a.assetId,b.assets)?.pose??'动作'} · 横向 ${Math.round(a.x*100)}% / 脚底 ${Math.round(a.y*100)}% / 比例 ${Math.round(a.width*100)}%${a.flip?' · 镜像':''}`;}
 if(key==='assetId')return findSticker(String(v),b.assets)?.name??String(v);
 if(['departAt','returnAt','claimedAt','createdAt','updatedAt','occurredAt','deliverAt','startedAt','endedAt','at'].includes(key))return new Date(v as string|number).toLocaleString();
 const words:Record<string,string>={manual:'手动记录',gps:'定位到访',pet:'宠物见闻',human:'人物',left:'左侧',right:'右侧',center:'中间',any:'自动安排',night:'夜晚灯火',rain:'雨天漫步',sunset:'落日暖光',vintage:'旧日胶片',normal:'认真拍的一张',tilted:'镜头有点歪',closeup:'不小心凑太近',in:'收到',out:'寄出'};
 if(typeof v==='string')return words[v]??v;if(typeof v==='boolean')return v?'是':'否';
 if(Array.isArray(v))return v.map((item,i)=>`${i+1}. ${typeof item==='object'?Object.entries(item).map(([k,x])=>`${labels[k]??k}：${show(k,x,b)}`).join('，'):String(item)}`).join('\n');
 return typeof v==='object'?Object.entries(v).map(([k,x])=>`${labels[k]??k}：${show(k,x,b)}`).join('，'):String(v);
}
function RecordSide({record,other,backup}:{record?:RecordValue;other?:RecordValue;backup:Backup}){
 if(!record)return <p className="conflict-deleted">此版本中已删除／没有这条记录。选择它将移除该记录。</p>;
 const keys=[...new Set([...Object.keys(record),...Object.keys(other??{})])].filter(k=>!['id','requestId'].includes(k)&&!equal(record[k],other?.[k]));
 return <dl>{keys.map(key=><div key={key}><dt>{labels[key]??key}</dt><dd>{key==='src'&&record.src?<img src={String(record.src)} alt="角色动作预览"/>:key==='attachments'&&Array.isArray(record.attachments)?record.attachments.map((a:any,i:number)=><figure key={i}><img src={a.image} alt={a.name}/><figcaption>{a.name}</figcaption></figure>):show(key,record[key],backup)}</dd></div>)}</dl>;
}
function saveFile(value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`manyou-conflict-backup-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function ConflictReview({onRefresh,onNotice}:{onRefresh:()=>Promise<void>;onNotice:(s:string)=>void}){
 const [review,setReview]=useState<Review|null>(null),[choices,setChoices]=useState<Record<string,Side>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[backup,setBackup]=useState<unknown>(null);
 useEffect(()=>{void setting('lastConflictBackup').then(setBackup);},[]);
 const rows=review?differences(review.base,review.local,review.remote):[],conflicts=rows.filter(r=>r.conflict),others=rows.filter(r=>!r.conflict),unresolved=conflicts.filter(r=>!choices[r.key]).length;
 async function load(){if(busy)return;setBusy(true);setError('');setReview(null);setChoices({});try{setReview(await loadConflictReview());}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function apply(){if(!review||busy)return;setBusy(true);setError('');try{await applyConflictReview(review,choices);setReview(null);setChoices({});await onRefresh();onNotice('已应用逐条选择；保存状态见页面顶部。');}catch(e){setError((e as Error).message);}finally{setBackup(await setting('lastConflictBackup'));setBusy(false);}}
 function row(r:Difference){return <article className="conflict-record" key={r.key}><h4>{names[r.store]} · {title(r)}</h4><p>{r.conflict?'两端都发生了变化，请选择保留哪一版。':'只有一端发生变化，默认保留更新；如需配套调整关联记录，可以改选。'}</p><div className="conflict-versions">{(['local','remote']as const).map(side=><label key={side} className={(choices[r.key]??r.automatic)===side?'chosen':''}><span><input type="radio" name={'conflict-'+r.key} disabled={busy} checked={(choices[r.key]??r.automatic)===side} onChange={()=>setChoices(c=>({...c,[r.key]:side}))}/>{side==='local'?'保留本机版':'保留云端版'}</span><RecordSide record={r[side]} other={r[side==='local'?'remote':'local']} backup={review![side]}/></label>)}</div></article>;}
 return <section className="conflict-review"><h3>两台设备的记录不一致？</h3><p>逐条对照再决定。未冲突的内容会自动合并，应用前会在本机保留最近一次双版本备份。</p><button className="secondary" disabled={busy} onClick={load}>{busy?'正在处理…':review?'重新加载差异':'查看同步差异'}</button>
 {error&&<p role="alert">{error}</p>}{review&&<><p role="status">{conflicts.length} 条需要选择 · {others.length} 条可自动合并{unresolved?` · 还有 ${unresolved} 条未选`:''}</p>{conflicts.map(row)}{others.length>0&&<details><summary>查看其他差异与关联记录（{others.length}）</summary>{others.map(row)}</details>}
 {!rows.length?<p>两端记录相同，无需处理。</p>:<><button className="text-button" onClick={()=>saveFile({format:'manyou-conflict-backup',version:1,createdAt:new Date().toISOString(),local:review.local,remote:review.remote})}>下载当前双版本备份</button><button className="primary" disabled={busy||unresolved>0} onClick={apply}>确认选择并同步</button></>}
 <button className="text-button" disabled={busy} onClick={()=>{setReview(null);setChoices({});}}>取消，不应用选择</button></>}
 {!!backup&&<><button className="text-button" onClick={()=>saveFile(backup)}>下载上次处理前的双版本备份</button><button className="text-button" onClick={()=>saveFile((backup as {local:Backup}).local)}>导出处理前的本机记录（可恢复）</button><button className="text-button" onClick={()=>saveFile((backup as {remote:Backup}).remote)}>导出处理前的云端记录（可恢复）</button></>}<p className="helper">关闭页面会清除未提交的选择，已保存的记录不会因此删除。可恢复记录可在设置的“从备份恢复”中合并导入。</p></section>;
}
