import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {places,placesInCity,cityIdOf,cities} from '../src/content.ts';
import {localDate,parseBackup,checkPosition} from '../src/domain.ts';
import {planTrip,validateTrip} from '../src/companions.ts';
import {startGuestMode,startTrip,claimTrip,readAll,exportBackup} from '../src/db.ts';

test('world content keeps Melbourne IDs, unique geolocations and 100 cities with preserved existing places',()=>{
 assert.equal(cities.length,100);assert.equal(places.length,196);assert.equal(new Set(places.map(p=>p.id)).size,196);
 assert.equal(placesInCity('melbourne').length,20);assert.ok(placesInCity('melbourne').some(p=>p.id==='flinders'));
 for(const c of cities)assert.ok(placesInCity(c.id).length>=1,c.id);
 const previousIds=JSON.parse(readFileSync(new URL('./world-v050-ids.json',import.meta.url),'utf8')) as string[];
 for(const id of previousIds)assert.ok(places.some(p=>p.id===id),`preserve existing place ${id}`);
 assert.equal(placesInCity('paris').length,7);assert.equal(placesInCity('tokyo').length,6);assert.equal(placesInCity('vancouver').length,1);
 for(const p of places){assert.ok(Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180);assert.ok(checkPosition(p,{lat:p.lat,lng:p.lng,accuracy:10,timestamp:1000},1000).ok);}
 const tokyo=placesInCity('tokyo')[0],melbourne=placesInCity('melbourne')[0];
 assert.equal(checkPosition(tokyo,{lat:melbourne.lat,lng:melbourne.lng,accuracy:10,timestamp:1000},1000).ok,false);
});
test('postcard dates follow destination timezone across midnight and daylight saving',()=>{
 const instant=new Date('2026-09-10T02:00:00Z');
 assert.equal(localDate('Asia/Tokyo',instant),'2026-09-10');assert.equal(localDate('America/New_York',instant),'2026-09-09');
 assert.equal(localDate('Europe/London',new Date('2026-07-01T23:30:00Z')),'2026-07-02');
});
test('new-city backup roundtrip and pet rewards remain tied to the destination',()=>{
 const p=placesInCity('tokyo')[0],now='2026-09-10T02:00:00Z';
 const backup={format:'postcard-backup',version:1,exportedAt:now,visits:[{id:'v',requestId:'r',placeId:p.id,occurredAt:now,timezone:'Asia/Tokyo',source:'manual'}],cards:[{id:'c',visitId:'v',placeId:p.id,category:'landmark',caption:'东京散步',date:'2026-09-10',createdAt:now,updatedAt:now,templateVersion:2}]};
 assert.deepEqual(parseBackup(JSON.stringify(backup)),backup);
 for(const c of cities.filter(c=>c.id!=='melbourne')){
  const trip=planTrip('city-'+c.id,'mikan-stand-v1',1000,60000,()=>.7);validateTrip(trip);
  assert.ok(trip.rewards.length>0);assert.ok(trip.rewards.every(r=>placesInCity(c.id).some(p=>p.id===r.placeId)));
  const invalid=structuredClone(trip);invalid.rewards[0].placeId='flinders';assert.throws(()=>validateTrip(invalid));
 }
 assert.equal(cityIdOf(places.find(p=>p.id==='flinders')!),'melbourne');
});

test('claiming a New York pet trip uses the destination date and survives backup without a human visit',async()=>{
 await startGuestMode();
 const departure=Date.parse('2026-09-10T01:59:00Z');
 await startTrip('city-new-york','mikan-stand-v1',60000,departure);
 const snapshot=await exportBackup(),trip=snapshot.trips![0];
 await claimTrip(trip.id,departure+60000);
 const data=await readAll();assert.equal(data.visits.length,0);assert.ok(data.cards.length>0);
 assert.ok(data.cards.every(c=>c.date==='2026-09-09'&&c.placeId.startsWith('new-york-')));
 const saved=await exportBackup();assert.deepEqual(parseBackup(JSON.stringify(saved)),saved);
});

test('a single-landmark city gives one pet card without duplicates and restores its timezone',async()=>{
 await startGuestMode();
 const departure=Date.parse('2026-09-10T01:59:00Z');
 await startTrip('city-vancouver','mikan-stand-v1',60000,departure);
 const trip=(await exportBackup()).trips![0];
 assert.equal(trip.rewards.length,1);assert.equal(trip.rewards[0].placeId,'vancouver-lighthouse');
 await claimTrip(trip.id,departure+60000);
 await claimTrip(trip.id,departure+60000);
 const saved=await exportBackup();assert.equal(saved.cards.length,1);assert.equal(saved.visits.length,0);
 assert.equal(saved.cards[0].date,'2026-09-09');
 assert.deepEqual(parseBackup(JSON.stringify(saved)),saved);
});
