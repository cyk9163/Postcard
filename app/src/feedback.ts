export const APP_VERSION='0.6.1';
export const feedbackPages=['小屋','出行 / 地图','地点 / 制作明信片','成就 / 足迹','旅伴 / 宠物','信箱','登录 / 账号','小屋设置 / 离线 / 同步','其他'] as const;
export interface FeedbackInput {page:string;steps:string;expected:string;actual:string;device:string;entry:string;online:boolean;}
// Only explicitly supplied form fields and coarse environment state are exported.
// Never read account details, storage, URLs, cards, coordinates or exception logs.
export function feedbackText(input:FeedbackInput){
 const clean=(text:string,max:number)=>text.trim().slice(0,max)||'未填写';
 return ['漫邮 · 内测反馈',`版本：${APP_VERSION}`,`页面：${feedbackPages.includes(input.page as typeof feedbackPages[number])?input.page:'其他'}`,`入口：${input.entry==='主屏幕'?'主屏幕':'浏览器'}`,`网络提示：${input.online?'设备显示在线（不代表服务一定可用）':'设备显示离线'}`,`设备 / 系统（自填）：${clean(input.device,100)}`,'',`操作步骤：\n${clean(input.steps,1500)}`,`原本期待：\n${clean(input.expected,1000)}`,`实际看到：\n${clean(input.actual,1500)}`].join('\n');
}

