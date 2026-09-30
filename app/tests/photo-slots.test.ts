import test from 'node:test';
import assert from 'node:assert/strict';
import {photoSlots} from '../src/photoSlots.generated.ts';
import {photoSlot,newTemplateVersion,fitPhotoActor} from '../src/photoSlots.ts';
test('new cards select reviewed backgrounds; old collections keep their original version',()=>{
 for(const id of Object.keys(photoSlots)){
  assert.equal(newTemplateVersion(id),3);
  assert.equal(photoSlot(id,'landmark',2),undefined);
  assert.equal(photoSlot(id,'landmark',1),undefined);
  assert.equal(photoSlot(id,'detail',3),undefined);
  assert.equal(photoSlot(id,'atmosphere',3),undefined);
  assert.ok(photoSlot(id,'landmark',3)?.src.startsWith('/cards/chat-v1/'));
 }
 assert.equal(newTemplateVersion('not-yet-produced'),2);
});
test('tall, wide and custom actors fit each fixed slot and cannot overlap protected landmarks',()=>{
 for(const slot of Object.values(photoSlots))for(const kind of ['human','pet'] as const)for(const id of ['mira-wave-v1','leo-wave-v1','mikan-wave-v1','custom-wide','mira-sit-v2'])for(const [sw,sh] of [[308,952],[358,980],[424,712],[1000,350],[350,1000]]){
  const f=fitPhotoActor(slot,kind,id,sw,sh,1400,770),b=slot.bounds;
  assert.ok(f.width>0&&f.height>0);
  assert.ok(f.left>=b[0]*1400&&f.left+f.width<=b[2]*1400);
  assert.ok(f.top>=b[1]*770&&f.top+f.height<=b[3]*770+.0001);
  assert.ok(f.sourceHeight<=sh);
  for(const p of slot.protected)assert.ok(f.left+f.width<=p[0]*1400||f.left>=p[2]*1400||f.top+f.height<=p[1]*770||f.top>=p[3]*770);
 }
});
