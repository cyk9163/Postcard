import assert from 'node:assert/strict';
const origin=process.env.MANYOU_TEST_URL??'http://127.0.0.1:8788',suffix=Date.now().toString(36),users=[];
async function request(path,data,cookie){const r=await fetch(origin+'/api/'+path,{method:data===undefined?'GET':'POST',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
for(const letter of ['a','b','c']){const r=await request('auth/register',{username:'test_'+suffix+letter,name:'测试'+letter,password:'Local-test-password-2026!'});assert.equal(r.status,200,JSON.stringify(r.body));assert.ok(r.body.recovery);users.push({...r.body,cookie:r.cookie});}
const [a,b,c]=users;const mine=(path,data)=>request(path,data,a.cookie),other=(path,data)=>request(path,data,b.cookie);
assert.equal((await request('sync')).status,401);
assert.equal((await mine('me')).body.id,a.id);
const snapshot={format:'postcard-backup',version:2,visits:[],cards:[],assets:[],trips:[],letters:[],walks:[],rewards:[],exportedAt:new Date().toISOString()};
assert.equal((await mine('sync',{revision:0,snapshot})).status,200);
assert.equal((await other('sync')).body.snapshot,null);
assert.equal((await mine('sync',{revision:0,snapshot})).status,409);
assert.equal((await mine('sync')).body.revision,1);
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6fT8AAAAASUVORK5CYII=';
const msg={id:crypto.randomUUID(),username:b.username,message:'private test message',delay:60000,attachments:[{name:'test',image}]};
assert.equal((await mine('mail',msg)).status,403);
assert.equal((await mine('friends',{username:b.username})).status,200);
assert.equal((await other('friends',{username:a.username,action:'accept'})).status,200);
assert.equal((await mine('mail',msg)).status,200);
assert.equal((await mine('mail',msg)).body.duplicate,true);
assert.equal((await other('mail')).body.letters[0].message,null);
assert.equal((await other('mail/'+msg.id)).status,425);
assert.equal((await request('mail/'+msg.id,undefined,c.cookie)).status,404);
assert.equal((await mine('mail/'+msg.id)).body.attachments.length,1);
assert.equal((await mine('mail',{...msg,id:crypto.randomUUID(),random:true})).status,403);
assert.equal((await other('block',{userId:a.id})).status,200);
assert.equal((await mine('mail',{...msg,id:crypto.randomUUID()})).status,403);
assert.equal((await other('block',{userId:a.id,remove:true})).status,200);
const generator=await mine('generator',{});assert.ok(generator.body.token);
const job=await mine('jobs',{name:'test character',kind:'human',prompt:'a traveler'});assert.equal(job.status,200);
assert.equal((await other('jobs/'+job.body.id)).status,404);
async function agent(path,body){const r=await fetch(origin+'/api/agent/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+generator.body.token},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
const leased=await agent('next',{});assert.equal(leased.body.job.id,job.body.id);
assert.equal((await agent('result',{id:job.body.id,lease:'invalid',image})).status,409);
assert.equal((await agent('result',{id:job.body.id,lease:leased.body.job.lease,image})).status,200);
assert.equal((await mine('jobs/'+job.body.id)).body.image,image);
const recovered=await request('auth/recover',{username:c.username,password:'Changed-test-password-2026!',recovery:c.recovery});assert.equal(recovered.status,200);assert.equal((await request('me',undefined,c.cookie)).status,401);
// Random delivery is only exercised on the isolated local database, so future
// production reruns cannot accidentally select a real opt-in user.
if(origin.startsWith('http://127.0.0.1:')){await mine('profile',{name:a.name,randomMail:true});await other('profile',{name:b.name,randomMail:true});const randomMessage={...msg,id:crypto.randomUUID(),random:true};try{assert.equal((await mine('mail',randomMessage)).status,200);}finally{await mine('profile',{name:a.name,randomMail:false});await other('profile',{name:b.name,randomMail:false});}}
const evil=await fetch(origin+'/api/profile',{method:'POST',headers:{'Content-Type':'application/json',Cookie:a.cookie,Origin:'https://another.example'},body:JSON.stringify({name:'changed'})});assert.equal(evil.status,403);
const switched=await fetch(origin+'/api/sync',{headers:{Cookie:a.cookie,'X-Manyou-Account':b.id}});assert.equal(switched.status,409);
console.log('PASS: registration, recovery, session isolation, sync conflicts, friendship, private/delayed mail, duplicate send, blocks, generation ownership and leases.');
// Retain only the test mail identifier for the delayed-delivery follow-up, never account credentials.
console.log('Delayed test mail:',msg.id);

console.log('Waiting for server-enforced delivery time...');await new Promise(r=>setTimeout(r,61000));assert.equal((await other('mail/'+msg.id)).status,200);assert.equal((await other('mail')).body.letters.find(l=>l.id===msg.id).message,msg.message);const reply={...msg,id:crypto.randomUUID(),replyTo:msg.id};assert.equal((await other('mail',reply)).status,200);console.log('PASS: real delayed opening and reply delivery.');
