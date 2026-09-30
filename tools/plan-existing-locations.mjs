import fs from 'node:fs';
import {placesInCity,cityById,places} from '../app/src/content.ts';
const file=new URL('../content/location-backlog.json',import.meta.url),rows=JSON.parse(fs.readFileSync(file,'utf8'));
const count=new Map(),seen=new Set();
for(const row of rows){if(seen.has(row.id)||places.some(p=>p.id===row.id))throw Error('Duplicate or already published candidate: '+row.id);seen.add(row.id);}
for(const row of rows){
 const n=(count.get(row.cityId)??0)+1;count.set(row.cityId,n);
 const prior=row.planning??{};
 row.planning={...prior,batch:n===1?'A: 每城先补一个差异化地点':'B: 同城第二候选',basis:'按现有覆盖和取景差异安排，未获得测试者需求，不是热度排名',publishedPlaces:placesInCity(row.cityId).length,testerRequests:prior.testerRequests??0,testerNotes:prior.testerNotes??[],sourceCheck:'沿用既有官方来源记录；本轮未重新联网核实',stage:prior.stage??'等待参考照片与机位',blockers:prior.blockers??['核实具体取景点坐标','找到许可清楚的参考照片','确认画面地面及人物锚点','人工核对三种卡面题材差异'],cardBriefs:prior.cardBriefs??[{category:'landmark',brief:row.viewBrief+'；地标全貌、可识别轮廓，前景留一侧站位'},{category:'atmosphere',brief:'选择同地点另一段步道、庭院或街景，体现空间与生活感；不只给全景换颜色'},{category:'detail',brief:'选择当地有辨识度的建筑、植物或物件细节；无完整地面时明确不合成人物'}]};
 row.generationApproved=false;
}
fs.writeFileSync(file,JSON.stringify(rows,null,2)+'\n');
const quote=x=>'"'+String(x).replaceAll('"','""')+'"';
fs.writeFileSync(new URL('../content/location-planning.csv',import.meta.url),'\ufeff'+[['批次','城市','地点','现有地点数','测试者需求数','选景要求','阶段','待补资料','官方来源（既有记录）'],...rows.map(r=>[r.planning.batch,cityById(r.cityId).name,r.name,r.planning.publishedPlaces,r.planning.testerRequests,r.viewBrief,r.planning.stage,r.planning.blockers.join('；'),r.officialSource])].map(r=>r.map(quote).join(',')).join('\n'));
console.log(rows.length+' candidates; '+count.size+' cities; generation remains paused.');
