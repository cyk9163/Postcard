import test from 'node:test';
import assert from 'node:assert/strict';
import {autoComposition,builtInStickers,validateSticker,validComposition} from '../src/companions.ts';
import {places,categories} from '../src/content.ts';
import {cardLayout} from '../src/layout.ts';
test('newly reviewed water, aerial and closeup scenes exclude humans while preserving pet cards',()=>{
 for(const id of ['sydney-opera','sydney-bondi','london-tower-bridge','kyoto-kiyomizu','singapore-botanic','singapore-merlion','london-big-ben'])for(const c of categories){
  assert.equal(autoComposition(id,c.id,'mira-stand-v1'),undefined);
  assert.ok(autoComposition(id,c.id,'mikan-stand-v1'));
  assert.ok(cardLayout(id,c.id).humanNote);
 }
 for(const c of categories)for(const actor of ['mira-stand-v1','mira-wave-v1','mira-camera-v2','mira-sit-v2'])assert.equal(autoComposition('rome-navona',c.id,actor)?.x,.81);
});
test('all published backgrounds have bounded anchors and aerial scenes exclude human composites',()=>{
 for(const p of places)for(const c of categories){
  const layout=cardLayout(p.id,c.id);
  for(const a of builtInStickers){const result=autoComposition(p.id,c.id,a.id);
   if(a.kind==='human'&&!layout.human)assert.equal(result,undefined);
   else {assert.ok(result&&validComposition(result));assert.ok(result.x>=.15&&result.x<=.85);}
  }
 }
 assert.equal(autoComposition('dubai-palm','landmark','mira-stand-v1'),undefined);
 assert.equal(autoComposition('kyoto-bamboo','landmark','mira-stand-v1')?.x,.5);
});
test('position tags survive validation and choose only available scene slots',()=>{
 const asset=validateSticker({id:'custom-test',characterId:'custom-person',name:'旅人',pose:'挥手',kind:'human',src:'data:image/png;base64,AAAA',positionTag:'right'});
 assert.equal(asset.positionTag,'right');assert.equal(autoComposition('flinders','landmark',asset.id,[asset])?.x,.83);
 const center={...asset,positionTag:'center' as const};assert.equal(autoComposition('flinders','landmark',center.id,[center])?.x,cardLayout('flinders','landmark').anchors[0].x);
 assert.throws(()=>validateSticker({...asset,positionTag:'invalid' as any}));
 assert.equal(autoComposition('flinders','landmark','missing'),undefined);
 const old={assetId:'mira-stand-v1',x:.39,y:.86,width:.4,flip:true};const copy={...old};
 autoComposition('flinders','landmark',old.assetId);assert.deepEqual(old,copy);assert.ok(validComposition(old));
});

test('reviewed closeups keep humans out and scene tags fall back to a reviewed ground slot',()=>{
 for(const id of ['flinders','paris-eiffel']){
  assert.equal(autoComposition(id,'detail','mira-stand-v1'),undefined);
  assert.equal(autoComposition(id,'detail','mira-wave-v1'),undefined);
  assert.ok(cardLayout(id,'detail').humanNote);
 }
 // A left-tagged action may not recreate the removed left slot in front of the station clock.
 const camera=autoComposition('flinders','landmark','mira-camera-v2')!;
 assert.equal(camera.x,cardLayout('flinders','landmark').anchors[0].x);
 for(const category of categories){
  const layout=cardLayout('tokyo-sensoji',category.id);
  for(const id of ['mira-stand-v1','mira-wave-v1','mira-camera-v2','mira-sit-v2']){
   const composition=autoComposition('tokyo-sensoji',category.id,id)!;
   assert.ok(layout.anchors.some(a=>a.x===composition.x&&a.y===composition.y));
   assert.ok(composition.x<.44||composition.x>.6,'keep the central lantern visible');
  }
 }
});
