import 'fake-indexeddb/auto';
import test from 'node:test';import assert from 'node:assert/strict';
import {planTrip,parseLetter,validComposition,validateSticker,type Letter} from '../src/companions.ts';
import {startTrip,claimTrip,readAll,readCompanions,exportBackup,importBackup,storeLetter,saveCard} from '../src/db.ts';
import {parseBackup} from '../src/domain.ts';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6fT8AAAAASUVORK5CYII=';
test('trip plans stay inside the selected region and keep fixed unique reward IDs',()=>{
 const trip=planTrip('gardens','mikan-stand-v1',100000,60000,()=>.9);
 assert.equal(trip.rewards.length,2);assert.deepEqual(new Set(trip.rewards.map(r=>r.placeId)),new Set(['gardens','shrine']));assert.equal(trip.returnAt,160000);assert.equal(new Set(trip.rewards.map(r=>r.id)).size,2);
 assert.throws(()=>planTrip('unknown','mikan-stand-v1'));assert.throws(()=>planTrip('centre','mikan-stand-v1',0,0));
});
test('composition and imported assets reject invalid positions, unsafe image URLs and unknown kinds',()=>{
 assert.equal(validComposition({assetId:'mira-stand-v1',x:Infinity,y:1,width:.3,flip:false}),false);
 assert.throws(()=>validateSticker({id:'custom-1',characterId:'custom-me',name:'me',pose:'wave',kind:'human',src:'https://tracking.example/image.png'}));
});
test('pet trips persist, reject early or concurrent claims, do not create human visits, and survive v2 backup',async()=>{
 const before=await readAll(),trip=await startTrip('centre','mikan-stand-v1',60000,100000);
 await assert.rejects(startTrip('centre','mikan-stand-v1',60000,100000),/先迎接/);
 await assert.rejects(claimTrip(trip.id,159999),/还在路上/);
 const counts=await Promise.all([claimTrip(trip.id,160000),claimTrip(trip.id,160000)]);
 assert.equal(counts.reduce((s,n)=>s+n,0),trip.rewards.length);
 const after=await readAll();assert.equal(after.visits.length,before.visits.length);assert.equal(after.cards.length-before.cards.length,trip.rewards.length);
 for(const c of after.cards){assert.equal(c.origin,'pet');assert.equal(c.visitId,'');assert.equal(c.tripId,trip.id);}
 const backup=parseBackup(JSON.stringify(await exportBackup()));assert.equal(backup.version,2);assert.equal(await importBackup(backup),0);
 assert.equal((await readCompanions()).trips[0].claimedAt,160000);
 const bad=structuredClone(backup);bad.cards[0].actor!.assetId='mira-stand-v1';assert.throws(()=>parseBackup(JSON.stringify(bad)),/角色/);
 await assert.rejects(startTrip('centre','mira-stand-v1',60000,200000),/请选择宠物/);
});
test('mail files validate delays and safe images, preserve reply threads, and import idempotently',async()=>{
 const letter:Letter={format:'manyou-letter',version:1,id:'letter-1',threadId:'thread-1',inReplyTo:'first-letter',sender:'小满',recipient:'朋友',message:'把今天的风景寄给你',createdAt:100000,deliverAt:160000,attachments:[{name:'车站',image}]};
 assert.deepEqual(parseLetter(JSON.stringify(letter)),letter);
 assert.equal(await storeLetter(letter,'in'),true);assert.equal(await storeLetter(letter,'in'),false);
 assert.equal((await readCompanions()).letters.length,1);
 for(const edit of [(l:any)=>l.attachments[0].image='javascript:alert(1)',(l:any)=>l.deliverAt=l.createdAt,(l:any)=>l.attachments=[],(l:any)=>l.message='字'.repeat(241)]){const bad=structuredClone(letter);edit(bad);assert.throws(()=>parseLetter(JSON.stringify(bad)));}
 const backup=parseBackup(JSON.stringify(await exportBackup()));assert.equal(backup.letters![0].threadId,'thread-1');assert.equal(await importBackup(backup),0);
});
