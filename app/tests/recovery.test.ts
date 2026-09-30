import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('full backup recovers into a separate empty process, with assets, pet provenance, mail and rewards',()=>{
 const worker=fileURLToPath(new URL('./fixtures/recovery-worker.ts',import.meta.url));
 const exported=spawnSync(process.execPath,['--experimental-strip-types',worker,'export'],{encoding:'utf8',timeout:15000});
 assert.equal(exported.status,0,exported.stderr);
 const recovered=spawnSync(process.execPath,['--experimental-strip-types',worker,'restore'],{input:exported.stdout,encoding:'utf8',timeout:15000});
 assert.equal(recovered.status,0,recovered.stderr);assert.equal(JSON.parse(recovered.stdout).stores,7);
});
