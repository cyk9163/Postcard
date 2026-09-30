import 'fake-indexeddb/auto';
import test from 'node:test';import assert from 'node:assert/strict';
import type {Backup,Visit,Postcard} from '../src/domain.ts';
import {differences} from '../src/conflicts.ts';
Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=> 'sync-test'},configurable:true});
const db=await import('../src/db.ts'),sync=await import('../src/sync.ts');
const stamp='2026-09-11T00:00:00Z';
const visit:Visit={id:'v1',requestId:'r1',placeId:'flinders',occurredAt:stamp,timezone:'Australia/Melbourne',source:'manual'};
const card:Postcard={id:'c1',visitId:'v1',placeId:'flinders',category:'landmark',caption:'before',date:'2026-09-11',createdAt:stamp,updatedAt:stamp,templateVersion:2};
let remote:Backup|null=null,revision=0,fail=false,rejectPost=false,afterUpload:(()=>Promise<void>)|null=null,posts=0;
globalThis.fetch=async(url,options)=>{
 if(fail)throw new TypeError('Network unavailable');
 if(String(url).endsWith('/me'))return Response.json({id:'sync-test'});
 if(options?.method==='POST'){posts++;if(rejectPost)return Response.json({error:'云端在提交前有了更新'},{status:409});const b=JSON.parse(options.body as string);assert.equal(b.revision,revision);remote=b.snapshot;revision++;if(afterUpload){const run=afterUpload;afterUpload=null;await run();}return Response.json({revision});}
 return Response.json({revision,snapshot:remote});
};
test('snapshot comparison ignores record order and field order without ignoring actual edits',()=>{
 const a={format:'postcard-backup',version:2,exportedAt:stamp,visits:[],cards:[card,{...card,id:'a'}]} as Backup;
 const b={...a,exportedAt:'later',cards:[{...card,id:'a'},Object.fromEntries(Object.entries(card).reverse()) as unknown as Postcard]};
 assert.ok(sync.sameSnapshot(a,b));b.cards[0].caption='changed';assert.equal(sync.sameSnapshot(a,b),false);
});
test('save during upload remains local, next sync uploads it; duplicate sync calls coalesce',async()=>{
 await db.saveCard(card,visit);afterUpload=()=>db.saveCard({...card,caption:'edited during upload'},visit);
 const a=sync.synchronize(),b=sync.synchronize();assert.equal(a,b);await a;
 assert.equal((await db.readAll()).cards[0].caption,'edited during upload');assert.equal(sync.syncState().phase,'local');assert.equal(remote!.cards[0].caption,'before');
 await sync.synchronize();assert.equal(remote!.cards[0].caption,'edited during upload');assert.equal(sync.syncState().phase,'synced');const count=posts;
 await sync.synchronize();assert.equal(posts,count);
});
test('network failure retains local work and retry uploads it; snapshot inspection restores pending state',async()=>{
 const edited={...card,caption:'offline edit'};await db.saveCard(edited,visit);fail=true;
 await assert.rejects(sync.synchronize());assert.equal(sync.syncState().phase,'error');assert.equal((await db.readAll()).cards[0].caption,'offline edit');
 await sync.inspectSync();assert.equal(sync.syncState().phase,'local');fail=false;await sync.synchronize();assert.equal(remote!.cards[0].caption,'offline edit');assert.equal(sync.syncState().phase,'synced');
});
test('same-record conflict never overwrites either side; failed atomic merge leaves database intact',async()=>{
 await db.saveCard({...card,caption:'local conflict'},visit);remote!.cards[0].caption='remote conflict';
 await assert.rejects(sync.synchronize(),/两台设备/);assert.equal((await db.readAll()).cards[0].caption,'local conflict');assert.equal(remote!.cards[0].caption,'remote conflict');
 const before=await db.exportBackup();await assert.rejects(db.applySyncedSnapshot(()=>{throw Error('conflict');},before,revision));assert.ok(sync.sameSnapshot(before,await db.exportBackup()));
});
test('per-record review rejects stale previews, backs up both sides, and preserves edits made during upload',async()=>{
 const stale=await sync.loadConflictReview(),count=posts;
 await db.saveCard({...card,caption:'new local after preview'},visit);
 await assert.rejects(sync.applyConflictReview(stale,{}),/新变化/);assert.equal(posts,count);
 const review=await sync.loadConflictReview(),rows=differences(review.base,review.local,review.remote),choices=Object.fromEntries(rows.filter(r=>r.conflict).map(r=>[r.key,'local' as const]));
 const extra={...card,id:'during-resolution',caption:'saved while applying choice'};
 afterUpload=async()=>{const backup=await db.setting<{local:Backup;remote:Backup}>('lastConflictBackup');assert.equal(backup!.local.cards[0].caption,'new local after preview');assert.equal(backup!.remote.cards[0].caption,'remote conflict');await db.saveCard(extra,visit);};
 await sync.applyConflictReview(review,choices);assert.equal((await db.readAll()).cards.find(c=>c.id==='c1')!.caption,'new local after preview');assert.ok((await db.readAll()).cards.some(c=>c.id===extra.id));assert.equal(sync.syncState().phase,'local');await sync.synchronize();assert.ok(remote!.cards.some(c=>c.id===extra.id));
});
test('changed remote revision and failed upload never apply selected records locally',async()=>{
 await db.saveCard({...card,caption:'second local conflict'},visit);remote!.cards.find(c=>c.id==='c1')!.caption='second remote conflict';
 const review=await sync.loadConflictReview();revision++;
 await assert.rejects(sync.applyConflictReview(review,{}),/新变化/);assert.equal((await db.readAll()).cards.find(c=>c.id==='c1')!.caption,'second local conflict');
 const fresh=await sync.loadConflictReview();fail=true;await assert.rejects(sync.applyConflictReview(fresh,{}));fail=false;assert.equal((await db.readAll()).cards.find(c=>c.id==='c1')!.caption,'second local conflict');
 const choices=Object.fromEntries(differences(fresh.base,fresh.local,fresh.remote).filter(r=>r.conflict).map(r=>[r.key,'local' as const]));rejectPost=true;await assert.rejects(sync.applyConflictReview(fresh,choices),/提交前/);rejectPost=false;
 assert.equal((await db.readAll()).cards.find(c=>c.id==='c1')!.caption,'second local conflict');assert.equal(remote!.cards.find(c=>c.id==='c1')!.caption,'second remote conflict');assert.ok(await db.setting('lastConflictBackup'));
});
