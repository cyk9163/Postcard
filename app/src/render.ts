import {placeById,categories,cityById,cityIdOf} from './content';import type {Postcard} from './domain';
import {paintScene} from './Scene';import type {Sticker} from './companions';
export async function renderCard(card:Postcard,assets:Sticker[]=[]):Promise<File>{
 const place=placeById(card.placeId);const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=1150;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('无法生成图片，请重试。');
 await document.fonts.ready;
 ctx.fillStyle=card.category==='atmosphere'?'#ecf0e4':'#f9f7f1';ctx.fillRect(0,0,1500,1150);
 if(card.category==='detail'){ctx.strokeStyle='#b7c5af';ctx.lineWidth=3;ctx.strokeRect(15,15,1470,1120);ctx.strokeRect(25,25,1450,1100);}
 await paintScene(ctx,card,assets,50,50,1400,770);
 ctx.fillStyle='#1b463c';ctx.font='bold 40px sans-serif';ctx.fillText(place.name,65,886);
 ctx.font='22px sans-serif';ctx.fillStyle='#6a756d';ctx.fillText(place.english+'  /  '+cityById(cityIdOf(place)).english.toUpperCase(),65,925,1120);
 ctx.textAlign='right';ctx.fillText(card.date,1435,880);ctx.fillText(categories.find(t=>t.id===card.category)!.name,1435,918);ctx.textAlign='left';
 ctx.font='25px sans-serif';ctx.fillStyle='#34483f';let line='',row=0;
 for(const ch of card.caption.replace(/\s+/g,' ')){if(ctx.measureText(line+ch).width>1330){ctx.fillText(line,65,978+row*34);line='';row++;}line+=ch;}
 if(row<4)ctx.fillText(line,65,978+row*34);
 ctx.font='14px sans-serif';ctx.fillStyle='#72786e';
 const credits:Record<string,string>={flinders:'Reference: Tobin Richard / Public domain',federation:'Reference: Donaldytong / Public domain',gardens:'Reference: Gary Houston / CC0',library:'Reference: Donaldytong (assumed) / Public domain',shrine:'Adapted from Donaldytong, Shrine of Remembrance 1 / Wikimedia Commons. CC BY-SA 3.0: creativecommons.org/licenses/by-sa/3.0/'};
 ctx.fillText(`漫邮 · ${card.origin==='pet'?'宠物见闻 / 非本人到访':'旅行手记'} · 艺术插画 / 非现场照片`,65,1095);ctx.fillText(place.credit??credits[place.id]??'',65,1124,1360);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],`postcard-${place.id}-${card.date}.png`,{type:'image/png'})):reject(Error('图片导出失败')),'image/png'));
}
