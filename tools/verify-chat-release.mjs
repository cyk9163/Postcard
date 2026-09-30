import fs from 'node:fs';import assert from 'node:assert/strict';
const [release,placeId]=process.argv.slice(2),root='https://manyou-melbourne.pages.dev';
const local=JSON.parse(fs.readFileSync(`${release}/offline-manifest.json`,'utf8'));
const live=await(await fetch(root+'/offline-manifest.json',{cache:'no-store'})).json();assert.equal(live.version,local.version);
const targets=local.files.filter(f=>f.url.startsWith('/cards/chat-v1/')&&(!placeId||f.url===`/cards/chat-v1/${placeId}-landmark.webp`));assert.ok(targets.length);
for(const f of targets){const response=await fetch(root+f.url);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),fs.readFileSync(release+f.url));}
console.log(`PASS: live manifest ${live.version}; ${targets.length} reviewed background(s) byte-identical.`);
