import test from 'node:test';import assert from 'node:assert/strict';
import {locate} from '../src/location.ts';
function device(){let success:PositionCallback=()=>{},error:PositionErrorCallback=()=>{};const cleared:number[]=[];return {geo:{watchPosition(s:PositionCallback,e?:PositionErrorCallback|null){success=s;error=e!;return 7;},clearWatch(id:number){cleared.push(id);}},fix(accuracy:number,timestamp=Date.now()){success({coords:{latitude:-37.8,longitude:145,accuracy},timestamp} as GeolocationPosition);},error(code:number){error({code} as GeolocationPositionError);},cleared};}
test('location waits through rough fixes and transient timeout, then clears watch on accurate fix',async()=>{const d=device(),messages:string[]=[];const p=locate(d.geo,new AbortController().signal,s=>messages.push(s));d.fix(900);d.error(3);d.fix(20,Date.now()-60000);assert.deepEqual(d.cleared,[]);d.fix(20);assert.equal((await p).coords.accuracy,20);assert.deepEqual(d.cleared,[7]);assert.ok(messages.some(s=>s.includes('900')));});
test('permission denial, deadline, and cancel all stop watch and reject',async()=>{
 const d=device();const denied=locate(d.geo,new AbortController().signal,()=>{});d.error(1);await assert.rejects(denied,/权限/);assert.deepEqual(d.cleared,[7]);
 const t=device();await assert.rejects(locate(t.geo,new AbortController().signal,()=>{},15),/超时/);assert.deepEqual(t.cleared,[7]);t.fix(10);
 const a=device(),controller=new AbortController();const cancelled=locate(a.geo,controller.signal,()=>{});controller.abort();await assert.rejects(cancelled,{name:'AbortError'});assert.deepEqual(a.cleared,[7]);
});
