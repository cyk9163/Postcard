/// <reference types="../app/node_modules/@cloudflare/workers-types" />
interface Env {DB:D1Database;ASSETS:Fetcher}
type User={id:string;username:string;display_name:string;salt:string;password_hash:string;recovery_hash:string;random_mail:number};
const enc=new TextEncoder(),uuid=()=>crypto.randomUUID();
const hex=(b:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(b)).map(v=>v.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const sha=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
function same(a:string,b:string){let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0;}
class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const fail=(s:number,m:string):never=>{throw new Failure(s,m);};
function str(x:unknown,n=200){if(typeof x!=='string'||!x.trim()||x.length>n)fail(400,'输入内容不完整或过长');return (x as string).trim();}
function picture(x:unknown){return typeof x==='string'&&x.length<1600000&&/^data:image\/(png|webp);base64,[A-Za-z0-9+/]+=*$/.test(x);}
const response=(body:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
async function body(req:Request,max=4500000){if(Number(req.headers.get('Content-Length'))>max)fail(413,'文件过大');const s=await req.text();if(enc.encode(s).length>max)fail(413,'文件过大');try{return JSON.parse(s);}catch{fail(400,'请求格式不正确');}}
async function rate(db:D1Database,key:string,max:number,window=3600000){const now=Date.now();const r=await db.prepare('INSERT INTO throttle(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING count').bind(key,now+window,now,now).first<{count:number}>();if(r!.count>max)fail(429,'操作太频繁，请稍后再试');}
async function session(req:Request,db:D1Database){const token=req.headers.get('Cookie')?.match(/(?:^|;\s*)manyou_session=([a-f0-9]{64})/)?.[1];if(!token)fail(401,'请先登录');const u=await db.prepare('SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.hash=? AND s.expires>?').bind(await sha(token!),Date.now()).first<User>();if(!u)fail(401,'登录已过期，请重新登录');return u!;}
function cookie(token:string,req:Request,age=2592000){return `manyou_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
const publicUser=(u:User)=>({id:u.id,username:u.username,name:u.display_name,randomMail:!!u.random_mail});
async function signedIn(u:User,req:Request,db:D1Database,recovery?:string){const token=random();await db.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(await sha(token),u.id,Date.now()+2592000000).run();return response({...publicUser(u),...(recovery?{recovery}:{})},200,{'Set-Cookie':cookie(token,req)});}
async function blocked(db:D1Database,a:string,b:string){return !!await db.prepare('SELECT 1 FROM blocks WHERE (owner=? AND target=?) OR (owner=? AND target=?)').bind(a,b,b,a).first();}
export default {async fetch(req:Request,env:Env):Promise<Response>{
 const path=new URL(req.url).pathname,db=env.DB;if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
 try{
  if(!db)return response({error:'云端数据库尚未连接'},503);
  if(!['GET','HEAD'].includes(req.method)){const origin=req.headers.get('Origin');if(origin&&origin!==new URL(req.url).origin)fail(403,'来源不匹配');if(req.headers.get('Sec-Fetch-Site')==='cross-site')fail(403,'来源不匹配');if(!req.headers.get('Content-Type')?.startsWith('application/json'))fail(415,'请使用 JSON 请求');}
  if(path==='/api/health')return response({ready:true,version:'0.6.2'});
  if(path.startsWith('/api/auth/')&&req.method==='POST'){
   const b=await body(req,4000),ip=req.headers.get('CF-Connecting-IP')??'local';await rate(db,'auth-ip:'+await sha(ip),30);
   const username=str(b.username,30).toLowerCase();if(!/^[a-z0-9_]{3,30}$/.test(username))fail(400,'用户名需为 3–30 位小写字母、数字或下划线');await rate(db,'auth-user:'+username,15);
   const pw=b.password;if(typeof pw!=='string'||pw.length>128||!pw.trim())fail(400,'请输入有效密码');if(pw.length<12)fail(400,'密码至少 12 位');
   let u=await db.prepare('SELECT * FROM users WHERE username=?').bind(username).first<User>();
   if(path==='/api/auth/register'){
    if(u)fail(409,'该用户名已被使用');await rate(db,'register:'+await sha(ip),5,86400000);
    const salt=random(),recovery=random();u={id:uuid(),username,display_name:str(b.name,30),salt,password_hash:await passwordHash(pw,salt),recovery_hash:await sha(recovery),random_mail:0};
    try{await db.batch([db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,0,?)').bind(u.id,u.username,u.display_name,u.salt,u.password_hash,u.recovery_hash,Date.now()),db.prepare('INSERT INTO snapshots(user_id,revision) VALUES(?,0)').bind(u.id)]);}catch{fail(409,'注册未完成，用户名可能已被使用');}
    return signedIn(u,req,db,recovery);
   }
   if(path==='/api/auth/recover'){
    if(!u||!same(await sha(str(b.recovery,64)),u.recovery_hash))fail(401,'用户名或恢复码不正确');const salt=random(),recovery=random();
    await db.batch([db.prepare('UPDATE users SET salt=?,password_hash=?,recovery_hash=? WHERE id=?').bind(salt,await passwordHash(pw,salt),await sha(recovery),u!.id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(u!.id),db.prepare('DELETE FROM generators WHERE owner=?').bind(u!.id)]);return signedIn(u!,req,db,recovery);
   }
   const candidate=await passwordHash(pw,u?.salt??'no-user-dummy-salt');if(!u||!same(candidate,u.password_hash))fail(401,'用户名或密码不正确');return signedIn(u!,req,db);
  }
  if(path.startsWith('/api/agent/')){
   const token=req.headers.get('Authorization')?.replace(/^Bearer /,'')??'',g=await db.prepare('SELECT owner FROM generators WHERE hash=? AND expires>?').bind(await sha(token),Date.now()).first<{owner:string}>();if(!g)fail(401,'工作端连接码已失效');await db.prepare('UPDATE generators SET last_seen=? WHERE hash=?').bind(Date.now(),await sha(token)).run();
   if(path==='/api/agent/next'&&req.method==='POST'){
    const lease=random(),now=Date.now();const job=await db.prepare("UPDATE jobs SET state='running',lease=?,lease_until=? WHERE id=(SELECT id FROM jobs WHERE (owner=? OR ?='__service__') AND (state='queued' OR (state='running' AND lease_until<?)) ORDER BY created_at LIMIT 1) RETURNING id,name,kind,prompt,reference,lease").bind(lease,now+900000,g!.owner,g!.owner,now).first();return response({job});
   }
   if(path==='/api/agent/result'&&req.method==='POST'){const b=await body(req);if(!b.error&&!picture(b.image))fail(400,'结果图片不正确');const r=await db.prepare("UPDATE jobs SET state=?,image=?,error=?,lease=NULL WHERE id=? AND (owner=? OR ?='__service__') AND lease=? AND state='running'").bind(b.error?'failed':'done',b.error?null:b.image,b.error?str(b.error,300):null,str(b.id),g!.owner,g!.owner,str(b.lease)).run();if(!r.meta.changes)fail(409,'任务租约已失效');return response({ok:true});}
   fail(404,'工作端接口不存在');
  }
  const u=await session(req,db);if(path!=='/api/me'&&req.headers.has('X-Manyou-Account')&&req.headers.get('X-Manyou-Account')!==u.id)fail(409,'账号已切换，请刷新页面后重试');
  if(path==='/api/me'&&req.method==='GET')return response(publicUser(u));
  if(path==='/api/logout'&&req.method==='POST'){const token=req.headers.get('Cookie')?.match(/manyou_session=([a-f0-9]{64})/)?.[1]??'';await db.prepare('DELETE FROM sessions WHERE hash=?').bind(await sha(token)).run();return response({ok:true},200,{'Set-Cookie':cookie('',req,0)});}
  if(path==='/api/profile'&&req.method==='POST'){const b=await body(req,2000);await db.prepare('UPDATE users SET display_name=?,random_mail=? WHERE id=?').bind(str(b.name,30),b.randomMail===true?1:0,u.id).run();return response({ok:true});}
  if(path==='/api/sync'&&req.method==='GET'){
   const r=await db.prepare('SELECT s.revision,c.body FROM snapshots s LEFT JOIN chunks c ON c.user_id=s.user_id AND c.generation=s.generation WHERE s.user_id=? ORDER BY c.part').bind(u.id).all<{revision:number;body:string|null}>();return response({revision:r.results[0]?.revision??0,snapshot:r.results[0]?.body?JSON.parse(r.results.map(x=>x.body).join('')):null});
  }
  if(path==='/api/sync'&&req.method==='POST'){
   await rate(db,'sync:'+u.id,120);const b=await body(req,32000000);if(!Number.isInteger(b.revision)||b.snapshot?.format!=='postcard-backup'||!Array.isArray(b.snapshot.cards)||!Array.isArray(b.snapshot.visits))fail(400,'同步数据不正确');const data=JSON.stringify(b.snapshot),generation=uuid();
   const head=await db.prepare('SELECT revision FROM snapshots WHERE user_id=?').bind(u.id).first<{revision:number}>();if(head?.revision!==b.revision)fail(409,'另一台设备已有更新，请重新同步');
   const parts=[];for(let i=0;i<data.length;i+=400000)parts.push(data.slice(i,i+400000));if(parts.length>40)fail(413,'云收藏超过当前 16 MB 上限，请导出备份并整理收藏');
   // The conditional head and chunk inserts run in one D1 transaction. A losing writer inserts no chunks.
   const statements=[db.prepare('UPDATE snapshots SET revision=revision+1,generation=?,updated_at=? WHERE user_id=? AND revision=?').bind(generation,Date.now(),u.id,b.revision),...parts.map((p,i)=>db.prepare('INSERT INTO chunks SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM snapshots WHERE user_id=? AND generation=?)').bind(u.id,generation,i,p,u.id,generation)),db.prepare('DELETE FROM chunks WHERE user_id=? AND generation!=(SELECT generation FROM snapshots WHERE user_id=?)').bind(u.id,u.id)];
   const results=await db.batch(statements);if(!results[0].meta.changes)fail(409,'另一台设备已有更新，请重新同步');return response({revision:b.revision+1});
  }
  if(path==='/api/friends'&&req.method==='GET'){const rows=await db.prepare('SELECT f.*,a.username sender_name,a.display_name sender_display,b.username recipient_name,b.display_name recipient_display FROM friendships f JOIN users a ON a.id=f.sender JOIN users b ON b.id=f.recipient WHERE f.sender=? OR f.recipient=?').bind(u.id,u.id).all();const blocks=await db.prepare('SELECT target FROM blocks WHERE owner=?').bind(u.id).all();return response({friends:rows.results,blocks:blocks.results});}
  if(path==='/api/friends'&&req.method==='POST'){
   await rate(db,'friends:'+u.id,30);const b=await body(req,2000),target=await db.prepare('SELECT id FROM users WHERE username=?').bind(str(b.username,30).toLowerCase()).first<{id:string}>();if(!target||target.id===u.id)fail(404,'找不到这位旅人');if(await blocked(db,u.id,target!.id))fail(403,'暂时无法联系这位旅人');
   if(b.action==='accept'){const r=await db.prepare("UPDATE friendships SET status='accepted' WHERE sender=? AND recipient=? AND status='pending'").bind(target!.id,u.id).run();if(!r.meta.changes)fail(404,'没有待接受的邀请');}
   else if(b.action==='remove')await db.prepare('DELETE FROM friendships WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)').bind(u.id,target!.id,target!.id,u.id).run();
   else {const existing=await db.prepare('SELECT 1 FROM friendships WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)').bind(u.id,target!.id,target!.id,u.id).first();if(!existing)await db.prepare("INSERT INTO friendships VALUES(?,?,'pending',?)").bind(u.id,target!.id,Date.now()).run();}return response({ok:true});
  }
  if(path==='/api/block'&&req.method==='POST'){const b=await body(req,2000),target=str(b.userId);if(target===u.id)fail(400,'不能屏蔽自己');if(b.remove)await db.prepare('DELETE FROM blocks WHERE owner=? AND target=?').bind(u.id,target).run();else await db.prepare('INSERT OR IGNORE INTO blocks VALUES(?,?)').bind(u.id,target).run();return response({ok:true});}
  if(path==='/api/mail-memory'&&req.method==='POST'){
   const b=await body(req,1000);if(typeof b.saved!=='boolean')fail(400,'请选择是否收藏');
   const id=str(b.mailId,80),m=await db.prepare('SELECT sender,recipient,deliver_at FROM mail WHERE id=? AND (sender=? OR recipient=?)').bind(id,u.id,u.id).first<{sender:string;recipient:string;deliver_at:number}>();
   if(!m)fail(404,'找不到来信');if(await blocked(db,u.id,m!.sender===u.id?m!.recipient:m!.sender))fail(403,'无法打开这封信');
   if(m!.sender!==u.id&&m!.deliver_at>Date.now())fail(425,'还没有到拆信时间');
   if(b.saved)await db.prepare('INSERT OR IGNORE INTO mail_memories VALUES(?,?,?)').bind(u.id,id,Date.now()).run();
   else await db.prepare('DELETE FROM mail_memories WHERE owner=? AND mail_id=?').bind(u.id,id).run();return response({ok:true});
  }
  if(path==='/api/mail'&&req.method==='GET'){
   const cursor=new URL(req.url).searchParams.get('before');let before=Number.MAX_SAFE_INTEGER,beforeId='~';
   if(cursor){const parts=cursor.split(':');before=Number(parts[0]);beforeId=parts[1];if(parts.length!==2||!Number.isSafeInteger(before)||before<0||!beforeId||beforeId.length>80)fail(400,'往来分页位置不正确');}
   const rows=await db.prepare(`SELECT m.*,a.display_name sender_name,b.display_name recipient_name,
    EXISTS(SELECT 1 FROM mail_memories WHERE owner=? AND mail_id=m.id) memory,
    (SELECT COUNT(*) FROM mail_images WHERE mail_id=m.id) attachment_count
    FROM mail m JOIN users a ON a.id=m.sender JOIN users b ON b.id=m.recipient
    WHERE (m.sender=? OR m.recipient=?) AND (m.created_at<? OR (m.created_at=? AND m.id<?))
    AND NOT EXISTS(SELECT 1 FROM blocks WHERE (owner=? AND target=CASE WHEN m.sender=? THEN m.recipient ELSE m.sender END) OR (target=? AND owner=CASE WHEN m.sender=? THEN m.recipient ELSE m.sender END))
    ORDER BY m.created_at DESC,m.id DESC LIMIT 101`).bind(u.id,u.id,u.id,before,before,beforeId,u.id,u.id,u.id,u.id).all<Record<string,unknown>>();
   const page=rows.results.slice(0,100),last=page.at(-1);
   return response({letters:page.map(m=>({...m,message:m.sender===u.id||Number(m.deliver_at)<=Date.now()?m.message:null})),nextCursor:rows.results.length>100?`${last!.created_at}:${last!.id}`:null});
  }
  if(path.startsWith('/api/mail/')&&req.method==='GET'){
   const id=path.slice('/api/mail/'.length),m=await db.prepare('SELECT * FROM mail WHERE id=? AND (sender=? OR recipient=?)').bind(id,u.id,u.id).first<{sender:string;recipient:string;deliver_at:number}>();if(!m)fail(404,'找不到来信');if(await blocked(db,u.id,m!.sender===u.id?m!.recipient:m!.sender))fail(403,'无法打开这封信');if(m!.sender!==u.id&&m!.deliver_at>Date.now())fail(425,'还没有到拆信时间');return response({attachments:(await db.prepare('SELECT name,image FROM mail_images WHERE mail_id=? ORDER BY part').bind(id).all()).results});
  }
  if(path==='/api/mail'&&req.method==='POST'){
   await rate(db,'mail:'+u.id,30,86400000);const b=await body(req),id=str(b.id,80);if(!/^[a-zA-Z0-9-]+$/.test(id))fail(400,'信件编号不正确');const old=await db.prepare('SELECT sender FROM mail WHERE id=?').bind(id).first<{sender:string}>();if(old){if(old.sender!==u.id)fail(409,'信件编号冲突');return response({id,duplicate:true});}
   if(!Array.isArray(b.attachments)||b.attachments.length>2||b.attachments.some((a:{image:unknown;name:unknown})=>!picture(a.image)||typeof a.name!=='string'||a.name.length>80))fail(400,'最多选择 2 张有效卡片');const message=typeof b.message==='string'?b.message:'';if(!message.trim()&&!b.attachments.length)fail(400,'请写留言或附上卡片');if([...message].length>240)fail(400,'留言最多 240 字');let target:string|undefined,thread=id,reply:string|null=null;
   if(b.replyTo){const prev=await db.prepare('SELECT * FROM mail WHERE id=? AND recipient=? AND deliver_at<=?').bind(str(b.replyTo),u.id,Date.now()).first<{sender:string;thread_id:string}>();if(!prev)fail(403,'尚不能回复这封信');target=prev!.sender;thread=prev!.thread_id;reply=b.replyTo;}
   else if(b.random){await rate(db,'random:'+u.id,3,86400000);if(!u.random_mail)fail(403,'请先主动开启随机收信');target=(await db.prepare('SELECT id FROM users WHERE id!=? AND random_mail=1 AND NOT EXISTS(SELECT 1 FROM blocks WHERE (owner=? AND target=users.id) OR (owner=users.id AND target=?)) ORDER BY RANDOM() LIMIT 1').bind(u.id,u.id,u.id).first<{id:string}>())?.id;}
   else{const t=await db.prepare('SELECT id FROM users WHERE username=?').bind(str(b.username,30).toLowerCase()).first<{id:string}>();target=t?.id;if(target&&!await db.prepare("SELECT 1 FROM friendships WHERE status='accepted' AND ((sender=? AND recipient=?) OR(sender=? AND recipient=?))").bind(u.id,target,target,u.id).first())fail(403,'先添加好友并等待对方接受');}
   if(!target)fail(404,'暂时没有可投递的旅人，请稍后再试');if(await blocked(db,u.id,target!))fail(403,'无法投递给这位旅人');const delay=Number(b.delay);if(![60000,7200000,21600000].includes(delay))fail(400,'请选择有效的等待时间');const now=Date.now();
   await db.batch([db.prepare('INSERT INTO mail VALUES(?,?,?,?,?,?,?,?)').bind(id,u.id,target!,thread,reply,message,now,now+delay),...b.attachments.map((a:{name:string;image:string},i:number)=>db.prepare('INSERT INTO mail_images VALUES(?,?,?,?)').bind(id,i,a.name,a.image))]);return response({id,deliverAt:now+delay});
  }
  if(path==='/api/report'&&req.method==='POST'){await rate(db,'report:'+u.id,10,86400000);const b=await body(req,3000);const m=await db.prepare('SELECT sender FROM mail WHERE id=? AND recipient=?').bind(str(b.mailId),u.id).first<{sender:string}>();if(!m)fail(404,'找不到该来信');await db.batch([db.prepare('INSERT INTO reports VALUES(?,?,?,?,?)').bind(uuid(),u.id,b.mailId,str(b.reason,500),Date.now()),db.prepare('INSERT OR IGNORE INTO blocks VALUES(?,?)').bind(u.id,m!.sender)]);return response({ok:true});}
  if(path==='/api/generator'&&req.method==='POST'){const token=random();await db.batch([db.prepare('DELETE FROM generators WHERE owner=?').bind(u.id),db.prepare('INSERT INTO generators VALUES(?,?,?,NULL)').bind(await sha(token),u.id,Date.now()+2592000000)]);return response({token});}
  if(path==='/api/jobs'&&req.method==='GET'){const gen=await db.prepare("SELECT MAX(last_seen) seen FROM generators WHERE (owner=? OR owner='__service__') AND expires>?").bind(u.id,Date.now()).first<{seen:number}>();const jobs=await db.prepare('SELECT id,name,kind,prompt,state,created_at,error,character_id FROM jobs WHERE owner=? ORDER BY created_at DESC LIMIT 30').bind(u.id).all();return response({online:!!gen?.seen&&Date.now()-gen.seen<90000,jobs:jobs.results});}
  if(path==='/api/jobs'&&req.method==='POST'){await rate(db,'jobs:'+u.id,10,86400000);const b=await body(req,1800000);if(!['human','pet'].includes(b.kind)||b.reference&&!picture(b.reference))fail(400,'角色资料不正确');const active=await db.prepare("SELECT COUNT(*) n FROM jobs WHERE owner=? AND state IN('queued','running')").bind(u.id).first<{n:number}>();if(active!.n>=3)fail(409,'已有三项任务等待制作');const id=uuid();await db.prepare("INSERT INTO jobs(id,owner,name,kind,prompt,reference,state,created_at,character_id) VALUES(?,?,?,?,?,?,'queued',?,?)").bind(id,u.id,str(b.name,30),b.kind,str(b.prompt,600),b.reference??null,Date.now(),b.characterId?str(b.characterId,100):null).run();return response({id});}
  if(path.startsWith('/api/jobs/')&&req.method==='GET'){const j=await db.prepare("SELECT id,name,kind,image,character_id FROM jobs WHERE id=? AND owner=? AND state='done'").bind(path.slice(10),u.id).first();if(!j)fail(404,'结果还未准备好');return response(j);}
  return fail(404,'接口不存在');
 }catch(e){return response({error:e instanceof Failure?e.message:'服务暂时不可用，请稍后重试'},e instanceof Failure?e.status:500);}
}};

