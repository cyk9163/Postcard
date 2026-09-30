import 'fake-indexeddb/auto';
import test from 'node:test';import assert from 'node:assert/strict';
import {saveCard,readAll,exportBackup,importBackup,deleteCard} from '../src/db.ts';
import type {Visit,Postcard} from '../src/domain.ts';
test('save is idempotent, backup merges without duplicates and preserves conflicting edits',async()=>{
 const timestamp='2026-09-10T00:00:00.000Z';
 const visit:Visit={id:'visit1',requestId:'request1',placeId:'flinders',occurredAt:timestamp,timezone:'Australia/Melbourne',source:'manual'};
 const card:Postcard={id:'card1',visitId:visit.id,placeId:'flinders',category:'landmark',caption:'original',date:'2026-09-10',createdAt:timestamp,updatedAt:timestamp,templateVersion:1};
 await Promise.all([saveCard(card,visit),saveCard(card,visit)]);
 let data=await readAll();assert.equal(data.visits.length,1);assert.equal(data.cards.length,1);
 const backup=await exportBackup();assert.equal(await importBackup(backup),0);
 backup.cards[0].caption='edited elsewhere';assert.equal(await importBackup(backup),1);
 assert.equal(await importBackup(backup),0,'reimporting the same conflicting backup must not make another copy');
 data=await readAll();assert.equal(data.visits.length,1);assert.equal(data.cards.length,2);assert.deepEqual(new Set(data.cards.map(c=>c.caption)),new Set(['original','edited elsewhere']));
 await deleteCard('card1');data=await readAll();assert.equal(data.cards.length,1);assert.equal(data.visits.length,1);
});
