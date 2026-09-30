import {newTemplateVersion} from './photoSlots';
import {useState} from 'react';
import {builtInStickers,autoComposition,type Sticker} from './companions';
import {placeById,cityById,cityIdOf} from './content';
import {localDate,type Postcard} from './domain';
import {Scene} from './Scene';
import './welcome.css';

export function Welcome({guest,assets,onSave,onDone}:{guest:boolean;assets:Sticker[];onSave:(placeId:string,actorId:string,caption:string)=>Promise<void>;onDone:(actorId:string)=>Promise<void>}){
 const [step,setStep]=useState(1),[actor,setActor]=useState('mira-stand-v1'),[place,setPlace]=useState('flinders'),[caption,setCaption]=useState(''),[visited,setVisited]=useState(false),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const p=placeById(place),now=new Date().toISOString();
 const sample:Postcard={id:'welcome-preview',visitId:'',placeId:place,category:'landmark',caption,date:localDate(cityById(cityIdOf(p)).timezone),createdAt:now,updatedAt:now,templateVersion:newTemplateVersion(place),actor:autoComposition(place,'landmark',actor,assets,newTemplateVersion(place))};
 async function finish(){if(busy)return;setBusy(true);try{await onDone(actor);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function collect(){if(busy)return;setBusy(true);setError('');try{if(!guest&&visited){await onSave(place,actor,caption);setSaved(true);}setStep(3);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="welcome" aria-label="初次旅行引导"><div className="welcome-top"><span>给第一段旅程，一点小小的仪式感</span><button disabled={busy} onClick={finish}>先随便看看</button></div>
 <ol className="welcome-steps" aria-label="体验进度">{['选旅伴','做张卡','放进旅册'].map((label,i)=><li key={label} aria-current={step===i+1?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
 <h1>{step===1?'谁陪你看看世界？':step===2?'第一张，写给此刻。':saved?'第一张纪念，收好啦。':'这就是你的第一张体验卡。'}</h1>
 <p>{step===1?'先选一位旅伴，以后还可以在小屋更换。':step===2?'先用一处示例风景试试，角色会自动站好。':saved?'已存入本机旅册，云端同步状态见页面顶部。':'体验卡只供预览，不会加入收藏或计入真实足迹。'}</p>
 {step===1?<div className="welcome-cast">{builtInStickers.filter(s=>s.kind==='human'&&s.id.endsWith('-stand-v1')).map(s=><button key={s.id} aria-pressed={actor===s.id} onClick={()=>setActor(s.id)}><img src={s.src} alt=""/><strong>{s.name}</strong></button>)}</div>:<><div className="welcome-card"><Scene card={sample} assets={assets}/><div><strong>{p.name}</strong><small>{saved?'手动记录':'示例体验 · 不代表到访'}</small><p>{caption||'把路过的美好，慢慢收起来。'}</p></div></div>{step===2&&<><fieldset className="welcome-places"><legend>选一张示例风景</legend>{['flinders','tokyo-sensoji','paris-eiffel'].map(id=><button key={id} aria-pressed={place===id} onClick={()=>{setPlace(id);setVisited(false);}}>{placeById(id).name}</button>)}</fieldset><label className="welcome-caption">想记住的一句话（可跳过）<textarea maxLength={120} rows={2} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="今天开始，慢慢收集世界。"/></label>{!guest&&<label className="welcome-confirm"><input type="checkbox" checked={visited} onChange={e=>setVisited(e.target.checked)}/>我确实去过这里，将这张卡作为今天的手动到访记录保存</label>}</>}
 </>}
 {error&&<p role="alert">{error}</p>}
 <div className="welcome-actions">{step===2&&<button className="secondary" disabled={busy} onClick={()=>setStep(1)}>上一步</button>}<button className="primary" disabled={busy} onClick={()=>step===1?setStep(2):step===2?void collect():void finish()}>{busy?'请稍等…':step===1?'选好了，做张卡':step===2?(!guest&&visited?'放进我的旅册':'预览放进旅册的效果'):'回到我的小屋'}</button></div>
 <p className="welcome-footnote">{guest?'游客体验刷新即清空，不能保存、导出或寄出。':'示例卡不会自动变成你的足迹。正式旅行可在“出行”里选择自己的目的地。'}</p>
 </section>;
}
