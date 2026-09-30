import 'fake-indexeddb/auto';
import test from 'node:test';import assert from 'node:assert/strict';
import {mergeSnapshots} from '../src/sync.ts';import {acceptPoint,pointsEarned,walkDistance,type Walk} from '../src/journey.ts';
import {saveCard,unlockReward,readJourney} from '../src/db.ts';import type {Backup,Visit} from '../src/domain.ts';
const visit:Visit={id:'v',requestId:'r',placeId:'flinders',occurredAt:'2026-09-10T01:00:00Z',timezone:'Australia/Melbourne',source:'manual'};
const empty:Backup={format:'postcard-backup',version:2,exportedAt:'2026-09-10T01:00:00Z',visits:[],cards:[],assets:[],trips:[],letters:[],walks:[],rewards:[]};
const card={id:'c',visitId:'v',placeId:'flinders',category:'landmark' as const,caption:'original',date:'2026-09-10',createdAt:'2026-09-10T01:00:00Z',updatedAt:'2026-09-10T01:00:00Z',templateVersion:2 as const};
test('three-way cloud sync preserves independent edits, deletions and reports conflicts',()=>{
 const base={...empty,visits:[visit],cards:[card]},deleted={...base,cards:[]};assert.deepEqual(mergeSnapshots(base,deleted,base).cards,[]);
 const edit={...base,cards:[{...card,caption:'local'}]};assert.equal(mergeSnapshots(base,edit,base).cards[0].caption,'local');
 assert.throws(()=>mergeSnapshots(base,edit,{...base,cards:[{...card,caption:'remote'}]}),/两台设备/);
 assert.equal(mergeSnapshots(null,empty,base).cards.length,1);
});
test('walking points reject GPS jumps; rewards count unique places and dates',async()=>{
 const p={lat:-37.81,lng:144.96,accuracy:10,at:1000};assert.ok(acceptPoint([],p));assert.equal(acceptPoint([p],{...p,lat:-38,at:4000}),false);assert.equal(acceptPoint([],{...p,accuracy:200}),false);
 const w:Walk={id:'w',startedAt:1000,endedAt:300000,points:[p,{...p,lat:-37.813,at:300000}]};assert.ok(walkDistance(w)>200);assert.equal(pointsEarned([visit,visit],[w,{...w,id:'w2'}]),30);
 await saveCard(card,visit);await assert.rejects(unlockReward('pose-camera'),/积分/);await saveCard({...card,id:'c2'},visit);assert.equal((await readJourney()).rewards.length,0);
});
