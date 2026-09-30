import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/yc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const origin='http://127.0.0.1:8791',suffix=Date.now().toString(36);
async function call(user,path,data){const r=await fetch(origin+'/api/'+path,{method:data===undefined?'GET':'POST',headers:{'CF-Connecting-IP':'qa-'+suffix,...(user?{Cookie:user.cookie}:{}),...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const users=[];for(const n of ['a','b','c']){const r=await call(null,'auth/register',{username:'story_'+suffix+n,name:n==='a'?'小林':'阿晴',password:'Local-story-test-2026!'});assert.equal(r.status,200);users.push({...r.body,cookie:r.cookie});}
const [a,b,c]=users;
await call(a,'friends',{username:b.username});await call(b,'friends',{username:a.username,action:'accept'});
const id=crypto.randomUUID(),letter={id,username:b.username,message:'在墨尔本遇见一场小雨，想把这段旅途讲给你听。',attachments:[],delay:60000};
assert.equal((await call(a,'mail',letter)).status,200);
assert.equal((await call(a,'mail',{...letter,id:crypto.randomUUID(),message:' '})).status,400);
assert.equal((await call(b,'mail')).body.letters[0].message,null);
assert.equal((await call(b,'mail-memory',{mailId:id,saved:true})).status,425);
assert.equal((await call(c,'mail-memory',{mailId:id,saved:true})).status,404);
assert.equal((await call(a,'mail-memory',{mailId:id,saved:true})).status,200);
assert.equal((await call(a,'mail')).body.letters[0].memory,1);
assert.equal((await call(b,'mail')).body.letters[0].memory,0);
assert.equal((await call(a,'mail?before=invalid')).status,400);
await call(b,'block',{userId:a.id});assert.equal((await call(a,'mail')).body.letters.length,0);assert.equal((await call(a,'mail-memory',{mailId:id,saved:false})).status,403);await call(b,'block',{userId:a.id,remove:true});
console.log('PASS: text-only mail, empty rejection, sealed access, memory ownership, cross-user isolation, block privacy. Waiting for delivery while browser installs.');
const browser=await chromium.launch({headless:true,channel:'msedge'}),context=await browser.newContext({viewport:{width:390,height:844}});
await context.addCookies([{name:'manyou_session',value:a.cookie.split('=')[1],url:origin}]);
await context.addInitScript(id=>localStorage.setItem('manyou-account',id),a.id);
const page=await context.newPage();await page.goto(origin);await page.getByRole('button',{name:'信箱',exact:true}).or(page.getByRole('button',{name:'先随便看看'})).first().waitFor({timeout:90000});const skip=page.getByRole('button',{name:'先随便看看'});if(await skip.isVisible())await skip.click();
await page.getByRole('button',{name:'信箱',exact:true}).click();await page.getByRole('heading',{name:'彼此的旅途'}).waitFor();
await page.getByRole('button',{name:'特别记忆',exact:true}).click();await page.locator('.letter-message').filter({hasText:letter.message}).waitFor();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.screenshot({path:'tmp/review/correspondence-mobile.png',fullPage:true});
await page.reload();await page.getByRole('button',{name:'信箱',exact:true}).click();await page.getByRole('button',{name:'特别记忆',exact:true}).click();await page.locator('.letter-message').filter({hasText:letter.message}).waitFor();
const remaining=Math.max(0,(await call(a,'mail')).body.letters[0].deliver_at-Date.now()+100);if(remaining)await new Promise(r=>setTimeout(r,remaining));
assert.equal((await call(b,'mail')).body.letters[0].message,letter.message);assert.equal((await call(b,'mail-memory',{mailId:id,saved:true})).status,200);
await call(a,'mail-memory',{mailId:id,saved:false});assert.equal((await call(b,'mail')).body.letters[0].memory,1);
assert.equal((await call(b,'mail',{...letter,id:crypto.randomUUID(),replyTo:id,message:'收到啦，愿下一程有好天气。'})).status,200);
console.log('PASS: mobile thread UI, private memory reload, actual delayed delivery, independent pins and text reply.');await browser.close();


