import test from 'node:test';import assert from 'node:assert/strict';import {differences,mergeSnapshots} from '../src/conflicts.ts';import type {Backup} from '../src/domain.ts';
const stamp='2026-09-11T00:00:00Z';
const base:Backup={format:'postcard-backup',version:2,exportedAt:stamp,visits:[{id:'v',requestId:'r',placeId:'flinders',occurredAt:stamp,timezone:'Australia/Melbourne',source:'manual'}],cards:['a','b'].map(id=>({id,visitId:'v',placeId:'flinders',category:'landmark',caption:'before',date:'2026-09-11',createdAt:stamp,updatedAt:stamp,templateVersion:2})),assets:[],trips:[],letters:[],walks:[],rewards:[]};
test('mixed choices resolve each card independently, merge additions, and distinguish deletion from edit',()=>{
 const local=structuredClone(base),remote=structuredClone(base);local.cards[0].caption='local a';remote.cards[0].caption='remote a';local.cards.splice(1,1);remote.cards[1].caption='remote edited b';remote.cards.push({...remote.cards[0],id:'new',caption:'remote addition'});
 const rows=differences(base,local,remote);assert.equal(rows.filter(r=>r.conflict).length,2);assert.equal(rows.find(r=>r.id==='b')!.local,undefined);assert.throws(()=>mergeSnapshots(base,local,remote),/两台设备/);
 const choices=Object.fromEntries(rows.filter(r=>r.conflict).map(r=>[r.key,r.id==='a'?'local' as const:'remote' as const]));const merged=mergeSnapshots(base,local,remote,choices);
 assert.equal(merged.cards.find(c=>c.id==='a')!.caption,'local a');assert.equal(merged.cards.find(c=>c.id==='b')!.caption,'remote edited b');assert.ok(merged.cards.some(c=>c.id==='new'));
 choices[rows.find(r=>r.id==='b')!.key]='local';assert.ok(!mergeSnapshots(base,local,remote,choices).cards.some(c=>c.id==='b'));assert.equal(base.cards[0].caption,'before');
});
test('incompatible linked choices are rejected instead of dropping records',()=>{
 const local=structuredClone(base),remote=structuredClone(base);local.visits=[];local.cards=[];remote.cards[0].caption='edited';
 const rows=differences(base,local,remote),conflict=rows.find(r=>r.id==='a')!;assert.throws(()=>mergeSnapshots(base,local,remote,{[conflict.key]:'remote'}),/明信片/);
 const visit=rows.find(r=>r.store==='visits')!;assert.equal(mergeSnapshots(base,local,remote,{[conflict.key]:'remote',[visit.key]:'remote'}).cards.length,1);
});
