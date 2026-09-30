import {useEffect,useRef,useState} from 'react';
import {placeById,legacyPlaceImages} from './content';
import {findSticker,type Sticker} from './companions';
import type {Postcard} from './domain';
import {photoSlot,fitPhotoActor} from './photoSlots';
import {weatherBackground} from './weatherBackgrounds';
const images=new Map<string,Promise<HTMLImageElement>>();
function loadImage(src:string){if(!images.has(src)){const image=new Image();image.src=src;const promise=image.decode().then(()=>image).catch(e=>{images.delete(src);throw e;});images.set(src,promise);}return images.get(src)!;}
export async function paintScene(ctx:CanvasRenderingContext2D,card:Postcard,assets:Sticker[],x:number,y:number,w:number,h:number){
 const place=placeById(card.placeId),slot=photoSlot(card.placeId,card.category,card.templateVersion);const background=await loadImage(weatherBackground(card.placeId,card.category,card.templateVersion,card.sceneTheme)??slot?.src??(card.templateVersion>=2?`/cards/city-v2/${place.id}-${card.category}.webp`:legacyPlaceImages[place.id]));
 const sticker=card.actor?findSticker(card.actor.assetId,assets):undefined;
 if(card.actor&&!sticker)throw Error('这张卡片的角色素材缺失，请从完整备份恢复。');
 const actor=sticker?await loadImage(sticker.src):null;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 ctx.save();ctx.translate(x+w/2,y+h/2);if(!slot&&card.quirk==='tilted')ctx.rotate(-.045);
 const scale=Math.max(w/background.width,h/background.height)*(!slot&&card.quirk==='tilted'?1.08:1);
 if(card.style==='sunset')ctx.filter='sepia(.18) saturate(1.2)';if(card.style==='vintage')ctx.filter='sepia(.65) saturate(.7)';
 ctx.drawImage(background,-background.width*scale/2,-background.height*scale/2,background.width*scale,background.height*scale);ctx.restore();
 if(actor&&card.actor){
  if(slot&&sticker){
   const fit=fitPhotoActor(slot,sticker.kind,sticker.id,actor.width,actor.height,w,h);
   ctx.save();ctx.beginPath();ctx.rect(x+w*slot.bounds[0],y+h*slot.bounds[1],w*(slot.bounds[2]-slot.bounds[0]),h*(slot.bounds[3]-slot.bounds[1]));
   for(const b of slot.protected)ctx.rect(x+w*b[0],y+h*b[1],w*(b[2]-b[0]),h*(b[3]-b[1]));
   ctx.clip('evenodd');
   ctx.drawImage(actor,0,0,actor.width,fit.sourceHeight,x+fit.left,y+fit.top,fit.width,fit.height);
   ctx.restore();ctx.restore();return;
  }
  const a=card.actor,ah=h*a.width*2,aw=ah*actor.width/actor.height;
  ctx.save();ctx.translate(x+w*a.x,y+h*a.y);if(a.flip)ctx.scale(-1,1);
  const border=document.createElement('canvas');border.width=actor.width;border.height=actor.height;const bc=border.getContext('2d')!;
  bc.drawImage(actor,0,0);bc.globalCompositeOperation='source-in';bc.fillStyle='#fffcf5';bc.fillRect(0,0,border.width,border.height);
  const edge=Math.max(2,w*.0035);for(let i=0;i<12;i++){const angle=i*Math.PI/6;ctx.drawImage(border,-aw/2+Math.cos(angle)*edge,-ah+Math.sin(angle)*edge,aw,ah);}
  ctx.drawImage(actor,-aw/2,-ah,aw,ah);ctx.restore();
 }
 ctx.restore();
}
export function Scene({card,assets,lazy=false}:{card:Postcard;assets:Sticker[];lazy?:boolean}){
 const frame=useRef<HTMLDivElement>(null),[ready,setReady]=useState(!lazy);
 useEffect(()=>{
  if(ready)return;
  if(!('IntersectionObserver' in window)){setReady(true);return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setReady(true);observer.disconnect();}},{rootMargin:'300px'});
  if(frame.current)observer.observe(frame.current);
  return()=>observer.disconnect();
 },[ready]);
 const canvas=useRef<HTMLCanvasElement>(null),[error,setError]=useState('');
 useEffect(()=>{if(!ready)return;let cancelled=false;const buffer=document.createElement('canvas');buffer.width=1400;buffer.height=770;const ctx=buffer.getContext('2d')!;
  paintScene(ctx,card,assets,0,0,1400,770).then(()=>{if(cancelled)return;const target=canvas.current?.getContext('2d');target?.clearRect(0,0,1400,770);target?.drawImage(buffer,0,0);setError('');}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};
 },[card,assets,ready]);
 return <div className="scene" ref={frame}>{error?<p role="status">{error}</p>:null}<canvas ref={canvas} width={ready?1400:1} height={ready?770:1} style={{aspectRatio:"1400 / 770"}} role="img" aria-label={`${placeById(card.placeId).name}，${card.origin==='pet'?'宠物见闻':card.actor?'角色合影':'风景明信片'}`}/></div>;
}
