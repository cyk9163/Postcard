import test from 'node:test';
import assert from 'node:assert/strict';
import {conversations,mailPreview,type RemoteMail} from '../src/conversations.ts';
const mail=(id:string,sender:string,recipient:string,time:number):RemoteMail=>({id,sender,recipient,sender_name:'同名',recipient_name:'同名',message:'hello',created_at:time,deliver_at:time+60000});
test('conversations group both directions by stable peer ID and exclude unrelated mail',()=>{
 const result=conversations([mail('3','me','a',3),mail('1','a','me',1),mail('2','b','me',2),mail('4','x','y',4)],'me');
 assert.deepEqual(result.map(g=>g.id),['a','b']);assert.deepEqual(result[0].letters.map(l=>l.id),['1','3']);
});
test('sealed mail preview never exposes text or invents delivery',()=>{assert.equal(mailPreview({...mail('1','a','me',1),message:null}),'一封信正在路上…');});
