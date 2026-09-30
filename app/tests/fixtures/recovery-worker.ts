import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import {saveCard,addSticker,startTrip,claimTrip,storeLetter,saveWalk,unlockReward,exportBackup,importBackup,readAll} from '../../src/db.ts';
import {parseBackup,type Backup} from '../../src/domain.ts';
const stamp='2026-09-11T00:00:00.000Z',time=Date.parse(stamp);
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6fT8AAAAASUVORK5CYII=';
const snapshot=(b:Backup)=>Object.fromEntries(['visits','cards','assets','trips','letters','walks','rewards'].map(key=>[key,[...((b as any)[key]??[])].sort((a,b)=>a.id.localeCompare(b.id))]));
if(process.argv[2]==='export'){
 await addSticker({id:'custom-recovery',characterId:'custom-traveler',name:'恢复测试角色',pose:'站立',kind:'human',positionTag:'right',src:image,custom:true});
 for(const [i,placeId] of ['flinders','tokyo-sensoji'].entries()){
  const visit={id:`visit-${i}`,requestId:`request-${i}`,placeId,occurredAt:stamp,timezone:i?'Asia/Tokyo':'Australia/Melbourne',source:'manual' as const};
  await saveCard({id:`card-${i}`,visitId:visit.id,placeId,category:'landmark',caption:`测试回忆 ${i} 🌿`,date:'2026-09-11',createdAt:stamp,updatedAt:stamp,templateVersion:2,actor:{assetId:'custom-recovery',x:.73,y:.96,width:.23,flip:false}},visit);
 }
 const trip=await startTrip('centre','mikan-stand-v1',60000,time);await claimTrip(trip.id,time+60000);
 await storeLetter({format:'manyou-letter',version:1,id:'letter-test',threadId:'thread-test',inReplyTo:'previous-test',sender:'测试甲',recipient:'测试乙',message:'测试回信',createdAt:time,deliverAt:time+60000,attachments:[{name:'测试附件',image}]},'in');
 await saveWalk({id:'walk-test',startedAt:time,endedAt:time+120000,points:[{lat:-37.8,lng:144.96,accuracy:10,at:time},{lat:-37.797,lng:144.96,accuracy:10,at:time+120000}]});
 await unlockReward('pose-camera');
 console.log(JSON.stringify(parseBackup(JSON.stringify(await exportBackup()))));
}else{
 let input='';for await(const chunk of process.stdin)input+=chunk;
 const backup=parseBackup(input);assert.equal((await readAll()).cards.length,0,'fresh process starts with empty IndexedDB');
 await importBackup(backup);assert.deepEqual(snapshot(await exportBackup()),snapshot(backup),'all seven stores survive recovery');
 assert.equal(await importBackup(backup),0,'repeat import is idempotent');
 assert.deepEqual(snapshot(await exportBackup()),snapshot(backup));
 for(const corrupt of [input.slice(0,-20),JSON.stringify({...backup,version:99}),JSON.stringify({...backup,assets:[]})]){
  assert.throws(()=>parseBackup(corrupt));assert.deepEqual(snapshot(await exportBackup()),snapshot(backup),'invalid file leaves recovered data intact');
 }
 const edited=structuredClone(backup);edited.cards.find(c=>c.id==='card-0')!.caption='另一份测试记忆';
 assert.equal(await importBackup(edited),1);assert.equal(await importBackup(edited),0);
 const cards=(await readAll()).cards;assert.ok(cards.some(c=>c.caption==='测试回忆 0 🌿'));assert.ok(cards.some(c=>c.caption==='另一份测试记忆'));
 console.log(JSON.stringify({status:'passed',stores:7,cards:backup.cards.length,repeatImport:'no duplicates',corruptFiles:'rejected without mutation',conflict:'both captions preserved'}));
}
