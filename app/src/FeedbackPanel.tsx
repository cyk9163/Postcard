import {useState} from 'react';
import {MessageCircle} from 'lucide-react';
import {feedbackPages,feedbackText} from './feedback';
import './feedback.css';
export function Feedback({standalone,online}:{standalone:boolean;online:boolean}){
 const [open,setOpen]=useState(false),[page,setPage]=useState<string>('小屋设置 / 离线 / 同步');
 const [steps,setSteps]=useState(''),[expected,setExpected]=useState(''),[actual,setActual]=useState(''),[device,setDevice]=useState('');
 const [preview,setPreview]=useState(''),[status,setStatus]=useState('');
 const change=()=>{setPreview('');setStatus('');};
 async function copy(){try{await navigator.clipboard.writeText(preview);setStatus('已复制。请粘贴给邀请你测试的朋友。');}catch{setStatus('这里无法自动复制，请长按下方反馈文字，选择全选并复制。');}}
 async function share(){try{await navigator.share({title:'漫邮内测反馈',text:preview});setStatus('分享窗口已关闭。是否发送成功，请在聊天软件中确认。');}catch(error){setStatus((error as Error).name==='AbortError'?'已取消分享，反馈仍在这里。':'无法打开分享窗口，请使用复制反馈。');}}
 return <article className="setting-card feedback-card"><MessageCircle size={26}/><h2>帮漫邮变得更好</h2><p>哪里卡住了，或哪一处让你喜欢？写下来，发给邀请你测试的朋友。</p><button className="secondary" aria-expanded={open} aria-controls="feedback-form" onClick={()=>setOpen(!open)}>{open?'收起反馈':'反馈问题 / 体验建议'}</button>
 {open&&<div id="feedback-form" className="feedback-form"><p className="helper">自动附上版本、使用入口和网络提示。不会自动读取账号、卡片、信件或位置，也不会自动发送。退出页面后这份反馈不会保留。</p>
 <label>发生在哪个页面<select value={page} onChange={e=>{setPage(e.target.value);change();}}>{feedbackPages.map(p=><option key={p}>{p}</option>)}</select></label>
 <label>手机型号 / 系统（选填）<input maxLength={100} value={device} placeholder="例如 iPhone 15，iOS 版本不清楚也没关系" onChange={e=>{setDevice(e.target.value);change();}}/></label>
 <label>你做了哪些操作？<textarea rows={3} maxLength={1500} value={steps} placeholder="例如：打开明信片 → 点编辑 → 改留言 → 保存" onChange={e=>{setSteps(e.target.value);change();}}/></label>
 <label>你希望看到什么？（选填）<textarea rows={2} maxLength={1000} value={expected} onChange={e=>{setExpected(e.target.value);change();}}/></label>
 <label>实际看到什么，或有什么建议？<textarea rows={3} maxLength={1500} value={actual} placeholder="可以抄下提示原文；正常体验和喜欢的地方也欢迎说。" onChange={e=>{setActual(e.target.value);change();}}/></label>
 <p className="helper">不要填写密码、恢复码或私密内容。截图请在聊天软件里自行添加，并遮住私人信息。</p>
 <button className="primary" disabled={!actual.trim()} onClick={()=>{setPreview(feedbackText({page,steps,expected,actual,device,entry:standalone?'主屏幕':'浏览器',online}));setStatus('请检查下面的完整内容，再选择复制或分享。');}}>预览这份反馈</button>
 {preview&&<div className="feedback-preview"><label>将要复制或分享的内容<textarea aria-label="反馈预览" readOnly rows={12} value={preview}/></label><button className="secondary" onClick={copy}>复制反馈</button>{typeof navigator.share==='function'&&<button className="secondary" onClick={share}>选择聊天软件分享</button>}<p className="helper">复制和分享只包含上方文字，没有自动附件。</p></div>}
 <p role="status" className="helper">{status}</p></div>}</article>;
}
