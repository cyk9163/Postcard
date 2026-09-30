import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackText,APP_VERSION} from '../src/feedback.ts';
test('feedback exports only explicit fields, never arbitrary diagnostics or private data',()=>{
 const report=feedbackText({page:'小屋',steps:'打开页面',expected:'看到伙伴',actual:'空白',device:'',entry:'浏览器',online:true,token:'secret-token',cards:['private-caption'],coordinates:'private-gps',url:'private-url'} as any);
 assert.ok(report.includes(APP_VERSION));assert.ok(report.includes('空白'));
 for(const secret of ['secret-token','private-caption','private-gps','private-url'])assert.ok(!report.includes(secret));
});
test('feedback bounds free text and restricts automatic page/entry labels',()=>{
 const report=feedbackText({page:'private-url',steps:'x'.repeat(2000),expected:'',actual:'问题',device:'',entry:'private-path',online:false});
 assert.ok(report.includes('页面：其他'));assert.ok(report.includes('入口：浏览器'));assert.ok(report.includes('设备显示离线'));
 assert.ok(!report.includes('private-'));assert.ok(!report.includes('x'.repeat(1501)));
});
