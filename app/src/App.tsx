import {availableSceneThemes,type SceneTheme} from './weatherBackgrounds';
import {newTemplateVersion} from './photoSlots';
import {CityAchievements} from './CityAchievements';
import {Feedback} from './FeedbackPanel';
import {APP_VERSION} from './feedback';
import {locate} from './location';
import {Welcome} from './Welcome';
import {subscribeSync,syncState} from './sync';
import {Cottage} from './Cottage';
import {DiscoveryHeader} from './DiscoveryHeader';
import {CloudAccount,CloudSocial,CharacterGenerator,CloudSync} from './Cloud';
import {LazyJourney} from './LazyJourney';
import {readJourney,isGuestMode} from './db';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {House,MapPin,ArrowUpRight,ArrowLeft,Check,Compass,BookOpen,Settings,Download,Share2,Plus,ChevronRight,WifiOff,X,Trash2,Mail,Upload,Navigation,RefreshCw} from 'lucide-react';
import {places,cities,cityById,cityIdOf,placesInCity,categories,placeById,type Place,type Category} from './content';
import {checkPosition,localDate,isDate,parseBackup,type Visit,type Postcard} from './domain';
import {readAll,saveCard,deleteCard,exportBackup,importBackup,setting,setSetting,clearSetting} from './db';
import {CityDownloads} from './CityDownloads';
import {renderCard} from './render';
import {Scene} from './Scene';
import {CompanionStudio,ActorControls} from './CompanionStudio';
import {Mailbox} from './Mailbox';
import {readCompanions} from './db';
import {autoComposition,quirkNames,type Sticker,type PetTrip,type StoredLetter} from './companions';

type Tab='home'|'explore'|'collection'|'settings'|'companions'|'mailbox';
interface Draft{visit?:Visit;card:Postcard;}
function formatDate(date:string){return date.replaceAll('-','.');}
function makeDraft(place:Place,source:'gps'|'manual'):Draft{const now=new Date().toISOString(),timezone=cityById(cityIdOf(place)).timezone;const visit:Visit={id:crypto.randomUUID(),requestId:crypto.randomUUID(),placeId:place.id,occurredAt:now,timezone,source};return {visit,card:{id:crypto.randomUUID(),visitId:visit.id,placeId:place.id,category:'landmark',caption:'',date:localDate(timezone),createdAt:now,updatedAt:now,templateVersion:newTemplateVersion(place.id)}};}
function Artwork({place,className=''}:{place:Place;className?:string}){const [error,setError]=useState(false);return error?<div className={`artwork missing ${className}`} style={{background:place.accent}}><Mail size={36}/><span>卡面正在准备</span></div>:<img loading="lazy" decoding="async" className={`artwork ${className}`} src={place.image} alt={`${place.name} · 旅行插画试验卡`} onError={()=>setError(true)}/>;}
export default function App(){
 const cloudState=useSyncExternalStore(subscribeSync,syncState);
 const [welcomeActive,setWelcomeActive]=useState(false),[welcomeChecked,setWelcomeChecked]=useState(false);
 const welcomeDraft=useRef<Draft|null>(null);
 const isIPhone=/iPhone/i.test(navigator.userAgent);
 const [tab,setTab]=useState<Tab>('home');const [selected,setSelected]=useState<Place|null>(null);const [draft,setDraft]=useState<Draft|null>(null);
 const [mapRequested,setMapRequested]=useState(false);
 const [cityId,setCityId]=useState('melbourne'),[collectionCity,setCollectionCity]=useState('all'),[exploreView,setExploreView]=useState<'places'|'map'>('places');
 const city=cityById(cityId),cityPlaces=placesInCity(cityId);
 const [data,setData]=useState<{visits:Visit[];cards:Postcard[]}>({visits:[],cards:[]});const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);
 const [online,setOnline]=useState(navigator.onLine);
 const [preview,setPreview]=useState<{url:string;file:File}|null>(null);const [savedDraft,setSavedDraft]=useState<Draft|null>(null);const [installHelp,setInstallHelp]=useState(false);
 const [removeId,setRemoveId]=useState<string|null>(null);const [backupFile,setBackupFile]=useState<File|null>(null);const [update,setUpdate]=useState<ServiceWorkerRegistration|null>(null);
 const [companions,setCompanions]=useState<{assets:Sticker[];trips:PetTrip[];letters:StoredLetter[]}>({assets:[],trips:[],letters:[]});
 const locationRequest=useRef<AbortController|null>(null);const [locationMessage,setLocationMessage]=useState('');
 useEffect(()=>()=>locationRequest.current?.abort(),[selected?.id]);
 const [ownedRewards,setOwnedRewards]=useState<string[]>([]);
 const [now,setNow]=useState(Date.now());const [collectionFilter,setCollectionFilter]=useState<'all'|'visit'|'pet'>('all');
 const upload=useRef<HTMLInputElement>(null);const draftQueue=useRef(Promise.resolve());const operation=useRef(false);const mounted=useRef(true);
 const visited=new Set(data.visits.map(v=>v.placeId));const standalone=matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone;
 async function refresh(){const [d,c]=await Promise.all([readAll(),readCompanions()]);setData(d);setCompanions(c);setNow(Date.now());setOwnedRewards((await readJourney()).rewards.map(r=>r.id));}
 useEffect(()=>{
  if(loading||welcomeChecked||(!isGuestMode&&cloudState.phase!=='synced'))return;
  let cancelled=false;
  Promise.all([setting<boolean>('welcomeDone'),setting<Draft>('draft'),readAll(),readCompanions(),readJourney()]).then(([done,d,saved,c,j])=>{
   if(cancelled)return;
   setWelcomeChecked(true);
   if(!done&&!d&&!saved.cards.length&&!saved.visits.length&&!c.assets.length&&!c.trips.length&&!c.letters.length&&!j.walks.length&&!j.rewards.length)setWelcomeActive(true);
  }).catch(report);
  return()=>{cancelled=true;};
 },[loading,welcomeChecked,cloudState.phase]);
 async function finishWelcome(actorId:string){
  await setSetting('defaultActor',actorId);await setSetting('welcomeDone',true);
  setWelcomeActive(false);setTab('home');welcomeDraft.current=null;window.scrollTo({top:0});
 }
 async function saveWelcome(placeId:string,actorId:string,caption:string){
  if(isGuestMode)throw Error('游客体验不能保存记录。');
  // Reuse record identifiers if a save is retried after a refresh failure.
  if(!welcomeDraft.current||welcomeDraft.current.card.placeId!==placeId)welcomeDraft.current=makeDraft(placeById(placeId),'manual');
  const d=welcomeDraft.current;
  d.card={...d.card,caption,actor:autoComposition(placeId,'landmark',actorId,companions.assets,d.card.templateVersion)};
  await saveCard(d.card,d.visit);await refresh();
 }
 function report(error:unknown){setNotice(error instanceof Error?error.message:'操作未完成，请重试。');}
 useEffect(()=>{mounted.current=true;Promise.all([readAll(),setting<Draft>('draft'),readCompanions()]).then(([saved,d,c])=>{if(mounted.current){setData(saved);setSavedDraft(d??null);setCompanions(c);readJourney().then(j=>setOwnedRewards(j.rewards.map(r=>r.id)));}}).catch(report).finally(()=>setLoading(false));
  const on=()=>setOnline(navigator.onLine);window.addEventListener('online',on);window.addEventListener('offline',on);
  if('serviceWorker'in navigator&&location.port!=='5173')navigator.serviceWorker.register('/sw.js').then(reg=>{if(reg.waiting && navigator.serviceWorker.controller)setUpdate(reg);reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',()=>{if(reg.waiting && navigator.serviceWorker.controller)setUpdate(reg);}));}).catch(()=>{});

  return()=>{mounted.current=false;window.removeEventListener('online',on);window.removeEventListener('offline',on);};
 },[]);
 useEffect(()=>{const tick=()=>setNow(Date.now());const timer=setInterval(tick,10000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};},[]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),6500);return()=>clearTimeout(id);},[notice]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url);},[preview]);
 const modalOpen=Boolean(draft||preview||installHelp||removeId||backupFile);
 useEffect(()=>{window.scrollTo({top:0});},[]);
 useEffect(()=>{
  if(!modalOpen)return;
  const previous=document.activeElement as HTMLElement|null;
  const modal=document.querySelector<HTMLElement>('.modal-backdrop:last-of-type .modal')??document.querySelector<HTMLElement>('.modal');
  const background=[...document.querySelectorAll<HTMLElement>('.shell > header,.shell > main,.shell > nav')];
  background.forEach(el=>el.inert=true);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const focusable=()=>modal?[...modal.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,textarea,[tabindex="0"]')]:[];
  focusable()[0]?.focus();
  const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const items=focusable();const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
  document.addEventListener('keydown',trap);
  return()=>{background.forEach(el=>el.inert=false);document.body.style.overflow=overflow;document.removeEventListener('keydown',trap);previous?.focus();};
 },[modalOpen]);
 function edit(next:Draft){setDraft(next);draftQueue.current=draftQueue.current.then(async()=>{await setSetting('draft',next);}).catch(report);}
 async function begin(source:'gps'|'manual'){
  if(!selected||operation.current)return;operation.current=true;setBusy(true);setLocationMessage('');
  try{
   if(source==='gps'){
    if(!isIPhone)throw Error('请在 iPhone 上使用定位到访，当前设备可以手动记录。');
    if(!window.isSecureContext)throw Error('定位需要 HTTPS 地址；现在可以先手动记录。');
    if(!navigator.geolocation)throw Error('浏览器不支持定位，可以手动记录。');
    const controller=new AbortController();locationRequest.current=controller;
    const position=await locate(navigator.geolocation,controller.signal,setLocationMessage);
    const result=checkPosition(selected,{lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,timestamp:position.timestamp});if(!result.ok)throw Error(result.message);
   }
   const next=makeDraft(selected,source);next.card.actor=autoComposition(next.card.placeId,next.card.category,await setting<string>('defaultActor')??'mira-stand-v1',companions.assets,next.card.templateVersion);if(locationRequest.current?.signal.aborted)return;edit(next);setSelected(null);
  }catch(e){if((e as Error).name!=='AbortError'){report(e);setLocationMessage((e as Error).message);}}finally{locationRequest.current=null;operation.current=false;setBusy(false);}
 }
 async function save(){if(!draft||operation.current)return;if(!isDate(draft.card.date)){setNotice('请选择有效的到访日期。');return;}operation.current=true;setBusy(true);try{await draftQueue.current;await saveCard({...draft.card,updatedAt:new Date().toISOString()},draft.visit);await refresh();setDraft(null);setSavedDraft(null);setTab('collection');setCollectionFilter('all');setNotice(isGuestMode?'已展示试用收藏效果，刷新后清空。':'已保存到本机。顶部显示“已同步”后，其他设备才能看到。');}catch(e){report(e);}finally{setBusy(false);operation.current=false;}}
 async function exportImage(card:Postcard){if(isGuestMode){setNotice('保存或分享明信片需要登录。试用内容不会保留。');return;}if(operation.current)return;operation.current=true;setBusy(true);try{const file=await renderCard(card,companions.assets);setPreview({file,url:URL.createObjectURL(file)});}catch(e){report(e);}finally{setBusy(false);operation.current=false;}}
 async function shareImage(){if(!preview)return;try{if(navigator.canShare?.({files:[preview.file]})){await navigator.share({files:[preview.file],title:'来自漫邮的一张明信片'});}else setNotice('请点“保存图片”，或长按预览图保存。');}catch(e){if((e as Error).name!=='AbortError')report(e);}}
 async function backup(){if(isGuestMode){setNotice('游客试用不能导出备份，请先登录。');return;}try{const b=await exportBackup();const blob=new Blob([JSON.stringify(b,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`postcard-backup-${localDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);setNotice('已准备备份文件，请确认保存到“文件”。');}catch(e){report(e);}}
 async function restore(){if(!backupFile)return;setBusy(true);try{if(backupFile.size>40_000_000)throw Error('备份超过 40 MB。');const parsed=parseBackup(await backupFile.text());const count=await importBackup(parsed);await refresh();setNotice(`恢复完成，新增 ${count} 张明信片。`);setBackupFile(null);}catch(e){report(e);}finally{setBusy(false);}}
 function switchTab(next:Tab){setTab(next);setSelected(null);window.scrollTo({top:0});}
 return <div className={`shell ${tab==='home'&&!selected&&!welcomeActive?'is-cottage':''}`}>{!isGuestMode&&<CloudSync onRefresh={refresh} onNotice={setNotice}/>} {isGuestMode&&<div className="trial-banner"><strong>游客试用</strong><span>仅本页体验，刷新或退出后清空；不能保存、导出或寄出。</span><button onClick={()=>location.reload()}>退出试用 / 登录</button></div>}
  {!welcomeActive&&<header className="topbar"><button className="brand" onClick={()=>switchTab('home')} aria-label="漫邮首页"><span className="brand-mark"><Mail size={23}/></span><span>漫邮<small>POSTCARD</small></span></button><div className="top-right"><span className="edition">把世界，带回小屋。</span><button className="icon-button" onClick={()=>switchTab('settings')} aria-label="小屋设置"><Settings size={19}/></button><button className="icon-button" onClick={()=>setInstallHelp(true)} aria-label="添加到 iPhone 主屏幕"><Plus size={22}/></button></div></header>}
  {!online&&<div className="connection"><WifiOff size={15}/>离线中 · 完整素材与简绘地图可用，同步和寄信需联网</div>}
  {update&&<div className="update"><span>新版本已准备好</span><button onClick={async()=>{await draftQueue.current;if(!update.waiting){setUpdate(null);return;}update.waiting.postMessage({type:'ACTIVATE_UPDATE'});navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});}}>保存草稿并更新 <RefreshCw size={14}/></button></div>}
  <main>
  {welcomeActive?<Welcome guest={isGuestMode} assets={companions.assets} onSave={saveWelcome} onDone={finishWelcome}/>:<>
  {tab==='home'&&!selected&&<Cottage assets={companions.assets} trips={companions.trips} cards={data.cards} visits={visited.size} now={now} onGo={switchTab}/>}
  {(tab==='settings'||tab==='companions')&&!selected&&<button className="subpage-back" onClick={()=>switchTab('home')}><ArrowLeft size={16}/>回到小屋</button>}

  {tab==='explore'&&!selected&&<>
   <DiscoveryHeader cityId={cityId} onCity={setCityId} visited={visited.size} cards={data.cards.length} onCollection={()=>switchTab('collection')}/>
   {savedDraft&&<button className="draft-banner" onClick={()=>{setDraft(savedDraft);setSavedDraft(null);}}>还有一张没写完的卡片 <span>继续写 <ChevronRight size={17}/></span></button>}
   <div className="explore-switch"><div role="group" aria-label="探索显示方式"><button aria-pressed={exploreView==='places'} onClick={()=>setExploreView('places')}><Compass size={17}/>精选地点</button><button aria-pressed={exploreView==='map'} onClick={()=>{setMapRequested(true);setExploreView('map');}}><MapPin size={17}/>地图探索</button></div><label className="quick-city"><span>当前城市</span><select aria-label="切换城市" value={cityId} onChange={e=>setCityId(e.target.value)}>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
   <div hidden={exploreView!=='map'}>{mapRequested&&<LazyJourney cityId={cityId} visits={data.visits} onNotice={setNotice} onRefresh={refresh} onPlace={p=>{setCityId(cityIdOf(p));setSelected(p);window.scrollTo({top:0});}}/>}</div>
   <div hidden={exploreView!=='places'}>
   <div className="section-title"><h2>下一站，{city.name}</h2><span>{cityPlaces.length} 个地方 · 慢慢收集</span></div>
   <section className="places-grid">{cityPlaces.map((place,i)=><button className="place-card" key={place.id} onClick={()=>setSelected(place)}>
    <div className="photo-wrap"><Artwork place={place}/><span className="photo-number">{String(i+1).padStart(2,'0')}</span><span className="photo-status">{visited.has(place.id)?<><Check size={14}/> 已到访</>:<><MapPin size={14}/> 等你来</>}</span></div>
    <div className="place-info"><p className="eyebrow">{place.area}</p><h3>{place.name}<ArrowUpRight size={23}/></h3><p className="english">{place.english}</p><div className="place-footer"><span>3 张风景卡面</span><span>{visited.has(place.id)?'再留一张纪念':'查看地点'}</span></div></div>
   </button>)}</section>
   </div>
   <p className="preview-note">首轮体验版 · 卡面与打卡范围仍在实测，图片不代表现场照片。</p>
  </>}
  {selected&&<section className="detail"><button className="back" onClick={()=>setSelected(null)}><ArrowLeft size={18}/>返回探索</button><div className="detail-layout"><div className="detail-photo"><Artwork place={selected}/><span className="postmark">{cityById(cityIdOf(selected)).english.toUpperCase()}<br/>A MOMENT TO KEEP</span></div><div className="detail-copy"><p className="eyebrow">{selected.area}</p><h1>{selected.name}</h1><p className="english">{selected.english}</p><p className="description">{selected.description}</p><div className="mini-categories">{categories.map(c=><div key={c.id}><Mail size={19}/><span>{c.name}</span></div>)}</div><p className="helper">首次记录可选三种主题卡面。部分背景适合保留纯风景；旧收藏保留原来的图片版本。</p>{isIPhone&&<button className="primary" disabled={busy} onClick={()=>begin('gps')}><Navigation size={18}/>{busy?'正在定位…':'我到这里了'}</button>}<button className={isIPhone?'secondary':'primary'} disabled={busy} onClick={()=>begin('manual')}>手动记录这次到访</button><p className="helper" role="status">{locationMessage||(isIPhone?'只在你点击时定位；手动记录会单独标注。':'当前设备支持手动记录；定位到访请用 iPhone 打开。')}</p>{busy&&locationRequest.current&&<button className="text-button" onClick={()=>{locationRequest.current?.abort();setLocationMessage('已取消定位。可以重试或手动记录。');}}>取消定位</button>}</div></div></section>}
  {tab==='companions'&&!selected&&<><CharacterGenerator assets={companions.assets} onRefresh={refresh} onNotice={setNotice}/><CompanionStudio assets={companions.assets} trips={companions.trips} now={now} onRefresh={refresh} onNotice={setNotice} onViewCards={()=>{setTab('collection');setCollectionFilter('pet');}}/></>}
  {tab==='mailbox'&&!selected&&<><CloudSocial cards={data.cards} assets={companions.assets} now={now} onNotice={setNotice}/><details className="setting-card file-mail"><summary>通过文件寄信 / 导入朋友的信</summary><Mailbox cards={data.cards} assets={companions.assets} letters={companions.letters} now={now} onRefresh={refresh} onNotice={setNotice}/></details></>}
  {tab==='collection'&&!selected&&<section><div className="page-heading"><p className="eyebrow">MY LITTLE COLLECTION</p><h1>成就 / 足迹</h1><p className="subheading">{data.cards.length} 张明信片 · {visited.size} 个本人到访地点</p></div><CityAchievements visits={data.visits} cards={data.cards} selected={collectionCity} onSelect={setCollectionCity}/><div className="collection-filters" aria-label="收藏分类">{([{id:'all',label:'全部'},{id:'visit',label:'我的旅行'},{id:'pet',label:'宠物见闻'}]as const).map(f=><button key={f.id} aria-pressed={collectionFilter===f.id} onClick={()=>setCollectionFilter(f.id)}>{f.label}</button>)}</div><label className="collection-city">按城市查看<select value={collectionCity} onChange={e=>setCollectionCity(e.target.value)}><option value="all">全部城市</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{collectionCity!=='all'&&!data.cards.some(c=>cityIdOf(placeById(c.placeId))===collectionCity)&&<p>这个城市还没有收藏，去探索里留下第一张吧。</p>}{loading?<p>正在打开收藏…</p>:data.cards.length===0?<div className="empty"><Mail size={48} strokeWidth={1}/><h2>第一张，还在路上</h2><p>记录一次到访，把今天放进收藏。</p><button className="primary" onClick={()=>switchTab('explore')}>去看看有哪些地方 <ArrowUpRight size={18}/></button></div>:<div className="collection-grid">{data.cards.filter(c=>(collectionCity==='all'||cityIdOf(placeById(c.placeId))===collectionCity)&&(collectionFilter==='all'||(collectionFilter==='pet'?c.origin==='pet':c.origin!=='pet'))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(card=>{const p=placeById(card.placeId),visit=data.visits.find(v=>v.id===card.visitId)!;return <article className="memory-card" key={card.id}><Scene card={card} assets={companions.assets} lazy/><div className="memory-copy"><span className="eyebrow">{formatDate(card.date)} · {card.origin==='pet'?'宠物见闻':visit?.source==='manual'?'手动记录':'定位到访'}</span><h2>{p.name}</h2><p className="helper">{cityById(cityIdOf(p)).name}</p><p className="memory-caption">{card.caption||'没有写下的话，就留给这张卡片。'}</p><span className="tag">{card.origin==='pet'?quirkNames[card.quirk??'normal']:categories.find(c=>c.id===card.category)?.name}</span><div className="memory-actions"><button onClick={()=>edit({card,visit})}>编辑</button><button disabled={busy} onClick={()=>exportImage(card)}><Share2 size={16}/>导出 / 分享</button><button className="icon-button" onClick={()=>setRemoveId(card.id)} aria-label={`删除${p.name}明信片`}><Trash2 size={16}/></button></div></div></article>;})}</div>}</section>}
  {tab==='settings'&&!selected&&<section className="settings-page"><div className="page-heading"><p className="eyebrow">READY FOR YOUR NEXT WALK</p><h1>出发前的小准备</h1></div><div className="settings-grid"><Feedback standalone={Boolean(standalone)} online={online}/><CloudAccount onNotice={setNotice} onRefresh={refresh}/><CityDownloads onNotice={setNotice}/><article className="setting-card"><BookOpen size={26}/><h2>记忆，也留一份备份</h2><p>{isGuestMode?'试用内容仅留在当前页面，不会保存到设备或云端，刷新即清空。':'账号收藏需要同步后才能在其他设备恢复。仍建议定期导出备份。'}</p><button className="secondary" onClick={backup}><Download size={17}/>导出记录备份</button><button className="text-button" onClick={()=>upload.current?.click()}><Upload size={16}/>从备份恢复</button><input ref={upload} type="file" accept=".json,application/json" hidden onChange={e=>{setBackupFile(e.target.files?.[0]??null);e.target.value='';}}/><p className="helper">备份包含记录、自定义角色和往来信件；内置卡面可重新下载。请妥善保管备份。</p></article><article className="setting-card"><Plus size={26}/><h2>放到 iPhone 主屏幕</h2><p>在 Safari 中点分享 → 添加到主屏幕，再从新图标打开。</p><button className="secondary" onClick={()=>setInstallHelp(true)}>查看使用说明 <ChevronRight size={17}/></button><p className="helper">{standalone?'你正在主屏幕应用中使用。':'当前是浏览器入口；主屏幕入口可能使用独立的数据空间。'}</p></article><article className="setting-card small-print"><h2>关于这个试验版</h2><p>漫邮 · World {APP_VERSION}</p><p>固定风景叠加角色贴图；内置六位旅人、两只宠物，人物有两种基础动作和两种积分动作。支持导入本地制作的透明角色。支持文件寄信，以及登录后的站内好友与随机来信。</p><p>地点范围尚待实地验证；本产品不提供导航或严格到访证明。游客试用刷新即清空；登录并同步时会保存到你的云端旅册。</p><a href="/content-sources.json" target="_blank" rel="noreferrer">查看素材与地点来源 <ArrowUpRight size={14}/></a></article></div></section>}
  </>}
  </main>
  {!welcomeActive&&<nav className="bottom-nav" aria-label="主要导航">{([{id:'home',label:'小屋',icon:House},{id:'explore',label:'出行',icon:Compass},{id:'collection',label:'成就 / 足迹',icon:BookOpen},{id:'mailbox',label:'信箱',icon:Mail}]as const).map(t=><button key={t.id} className={(tab===t.id||(t.id==='home'&&(tab==='companions'||tab==='settings')))?'active':''} onClick={()=>switchTab(t.id)}><t.icon size={21}/><span>{t.label}</span></button>)}</nav>}
  {draft&&<div className="modal-backdrop"><section className="editor modal" role="dialog" aria-modal="true" aria-label="制作明信片"><div className="modal-header"><span>写给此刻</span><button className="icon-button" onClick={()=>{setSavedDraft(draft);setDraft(null);}} aria-label="关闭并保留草稿"><X/></button></div><div className={`editor-preview category-${draft.card.category}`}><Scene card={draft.card} assets={companions.assets}/><div className="editor-caption"><strong>{placeById(draft.card.placeId).name}</strong><span>{formatDate(draft.card.date)}</span><p>{draft.card.caption||'在这里，写下你想记住的一句话。'}</p></div></div><div className="editor-fields"><div className="category-tabs" role="group" aria-label="选择卡片版式">{categories.map(c=><button key={c.id} className={draft.card.category===c.id?'active':''} onClick={()=>edit({...draft,card:{...draft.card,category:c.id,sceneTheme:c.id==='landmark'?draft.card.sceneTheme:undefined,actor:draft.card.actor?autoComposition(draft.card.placeId,c.id,draft.card.actor.assetId,companions.assets,draft.card.templateVersion):undefined}})}>{c.name}</button>)}</div><ActorControls templateVersion={draft.card.templateVersion} placeId={draft.card.placeId} category={draft.card.category} unlocked={ownedRewards} value={draft.card.actor} kind={draft.card.origin==='pet'?'pet':'human'} allowNone={draft.card.origin!=='pet'} assets={companions.assets} onChange={actor=>edit({...draft,card:{...draft.card,actor}})}/>{availableSceneThemes(draft.card.placeId,draft.card.category,draft.card.templateVersion).length>0&&<label className="style-picker">场景主题<select value={draft.card.sceneTheme??'day'} onChange={e=>edit({...draft,card:{...draft.card,sceneTheme:e.target.value==='day'?undefined:e.target.value as SceneTheme}})}><option value="day">原始场景</option>{availableSceneThemes(draft.card.placeId,draft.card.category,draft.card.templateVersion).map(t=><option key={t} value={t}>{t==='night'?'夜晚灯火':'雨天漫步'}</option>)}</select></label>}<label className="style-picker">背景风格<select value={draft.card.style??'original'} onChange={e=>edit({...draft,card:{...draft.card,style:e.target.value==='original'?undefined:e.target.value as 'sunset'|'vintage'}})}><option value="original">原画色彩</option>{ownedRewards.includes('style-sunset')&&<option value="sunset">落日暖光</option>}{ownedRewards.includes('style-vintage')&&<option value="vintage">旧日胶片</option>}</select></label><label>记录日期<input type="date" value={draft.card.date} onChange={e=>edit({...draft,card:{...draft.card,date:e.target.value}})}/></label><label>想记住的话 <span>{[...draft.card.caption].length}/120</span><textarea rows={3} placeholder="那天的天气、遇见的人，或一个小小的发现…" value={draft.card.caption} onChange={e=>edit({...draft,card:{...draft.card,caption:[...e.target.value].slice(0,120).join('')}})}/></label><button className="primary" disabled={busy||!draft.card.date} onClick={save}><Check size={18}/>{busy?'请稍等…':isGuestMode?'预览收藏效果（不保存）':'保存到我的收藏'}</button><p className="helper">{draft.card.origin==='pet'?'宠物见闻，不计入本人足迹':draft.visit?.source==='manual'?'手动记录':'定位到访'} · {isGuestMode?'试用草稿仅在本页有效，刷新即清空。':'草稿自动保存在此设备；导出时文字会自动连续排版。'}</p></div></section></div>}
  {preview&&<div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="分享明信片"><div className="modal-header"><span>把这一刻，分享出去</span><button className="icon-button" onClick={()=>setPreview(null)} aria-label="关闭图片预览"><X/></button></div><img className="export-preview" src={preview.url} alt="导出的明信片"/><div className="modal-body"><button className="primary" onClick={shareImage}><Share2 size={18}/>分享图片</button><a className="secondary" href={preview.url} download={preview.file.name}>保存图片 <Download size={18}/></a><p className="helper">若未出现保存选项，可长按上方图片。取消分享不会影响收藏。</p></div></section></div>}
  {installHelp&&<div className="modal-backdrop"><section className="modal compact" role="dialog" aria-modal="true" aria-label="添加到主屏幕"><div className="modal-header"><span>把漫邮带在身边</span><button className="icon-button" onClick={()=>setInstallHelp(false)} aria-label="关闭说明"><X/></button></div><div className="modal-body"><ol className="install-steps"><li>用 iPhone 的 <strong>Safari</strong> 打开漫邮网址。</li><li>点分享按钮，选择<strong>添加到主屏幕</strong>。</li><li>从主屏幕新图标打开，等待<strong>完整游戏素材下载完成</strong>。</li></ol><p>Safari 与主屏幕入口可能使用不同的本地数据。已有记录请先导出备份，再到新入口恢复。</p><button className="primary" onClick={()=>setInstallHelp(false)}>知道了</button></div></section></div>}
  {removeId&&<div className="modal-backdrop"><section className="modal compact" role="alertdialog" aria-modal="true" aria-label="删除明信片"><div className="modal-body"><h2>移除这张明信片？</h2><p>到访记录和已解锁的卡片仍会保留。删除后可从你之前导出的备份恢复。</p><button className="danger" onClick={async()=>{try{await deleteCard(removeId);setRemoveId(null);await refresh();}catch(e){report(e);}}}>删除这张卡</button><button className="secondary" onClick={()=>setRemoveId(null)}>保留</button></div></section></div>}
  {backupFile&&<div className="modal-backdrop"><section className="modal compact" role="alertdialog" aria-modal="true" aria-label="恢复备份"><div className="modal-body"><h2>恢复这份备份？</h2><p>{backupFile.name}</p><p>相同记录会跳过，冲突内容会保留副本，不清空现有收藏。</p><button className="primary" disabled={busy} onClick={restore}>合并备份</button><button className="secondary" disabled={busy} onClick={()=>setBackupFile(null)}>取消</button></div></section></div>}
  {notice&&<div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="关闭提示"><X size={16}/></button></div>}
 </div>;
}


