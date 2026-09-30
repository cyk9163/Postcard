import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherBackgrounds} from '../src/weatherBackgrounds.generated.ts';
import {availableSceneThemes,weatherBackground,weatherImages} from '../src/weatherBackgrounds.ts';
import {parseBackup} from '../src/domain.ts';
import {cityFiles} from '../src/city-offline.ts';
import {placesInCity,categories} from '../src/content.ts';
test('weather editions are explicit, preserve old cards, and never silently substitute daytime',()=>{
 for(const [id,themes] of Object.entries(weatherBackgrounds)){
  assert.deepEqual(availableSceneThemes(id,'landmark',2),[]);
  assert.deepEqual(availableSceneThemes(id,'detail',3),[]);
  assert.equal(weatherBackground(id,'landmark',3),undefined);
  for(const theme of availableSceneThemes(id,'landmark',3))assert.equal(weatherBackground(id,'landmark',3,theme),themes[theme as keyof typeof themes]);
 }
 assert.throws(()=>weatherBackground('unknown','landmark',3,'rain'));
 assert.throws(()=>weatherBackground('flinders','detail',3,'night'));
});
test('backup and cloud snapshot parsing preserve weather themes and reject invalid combinations',()=>{
 const visit={id:'v',requestId:'r',placeId:'flinders',occurredAt:'2026-09-12T00:00:00Z',timezone:'Australia/Melbourne',source:'manual'};
 const card={id:'c',visitId:'v',placeId:'flinders',category:'landmark',caption:'下雨的那天',date:'2026-09-12',createdAt:visit.occurredAt,updatedAt:visit.occurredAt,templateVersion:3};
 const backup=(c:object)=>JSON.stringify({format:'postcard-backup',version:1,visits:[visit],cards:[c]});
 for(const sceneTheme of ['night','rain'])assert.equal(parseBackup(backup({...card,sceneTheme})).cards[0].sceneTheme,sceneTheme);
 assert.equal(parseBackup(backup(card)).cards[0].sceneTheme,undefined);
 for(const changes of [{sceneTheme:'snow'},{sceneTheme:null},{sceneTheme:''},{sceneTheme:'night',templateVersion:2},{sceneTheme:'rain',category:'detail'}])assert.throws(()=>parseBackup(backup({...card,...changes})),/天气/);
});
test('city offline pack contains all published weather images and rejects incomplete manifests',()=>{
 const urls=[...new Set(placesInCity('melbourne').flatMap(p=>[p.image,...weatherImages(p.id),...categories.map(c=>`/cards/city-v2/${p.id}-${c.id}.webp`)]))];
 const manifest={version:'test',files:urls.map(url=>({url,bytes:1,sha256:'test'}))};
 const files=cityFiles(manifest,'melbourne');
 for(const url of weatherImages('flinders'))assert.ok(files.some(f=>f.url===url));
 assert.throws(()=>cityFiles({...manifest,files:manifest.files.filter(f=>f.url!==weatherImages('flinders')[0])},'melbourne'),/完整/);
});
