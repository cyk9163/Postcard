import 'fake-indexeddb/auto';
import {openDB} from 'idb';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readAll,saveCard,startGuestMode,setSetting,setting,startTrip,claimTrip,readCompanions} from '../src/db.ts';
import {api} from '../src/sync.ts';
import type {Visit,Postcard} from '../src/domain.ts';
test('guest trial stays in isolated memory, resets, and cannot call cloud APIs',async()=>{
 const v:Visit={id:'old-visit',requestId:'old-request',placeId:'flinders',occurredAt:'2026-09-10T01:00:00Z',timezone:'Australia/Melbourne',source:'manual'};
 const c:Postcard={id:'old-card',visitId:v.id,placeId:v.placeId,category:'landmark',caption:'original',date:'2026-09-10',createdAt:v.occurredAt,updatedAt:v.occurredAt,templateVersion:2};
 await saveCard(c,v);await setSetting('draft','old');
 await startGuestMode();assert.equal((await readAll()).cards.length,0);assert.equal(await setting('draft'),undefined);
 await saveCard({...c,id:'trial-card'},v);await setSetting('draft','trial');assert.equal((await readAll()).cards.length,1);
 const persistent=await openDB('postcard-local');assert.equal((await persistent.getAll('cards')).length,1);assert.equal((await persistent.getAll('cards'))[0].caption,'original');assert.equal(await persistent.get('settings','draft'),'old');persistent.close();
 const trip=await startTrip('centre','mikan-stand-v1',60000,1000);await claimTrip(trip.id,61000);assert.equal((await readCompanions()).trips.length,1);
 await assert.rejects(api('me'),/游客/);
 await startGuestMode();assert.equal((await readAll()).cards.length,0);assert.equal(await setting('draft'),undefined);
});
