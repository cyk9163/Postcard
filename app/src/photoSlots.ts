import {photoSlots} from './photoSlots.generated.ts';
export interface PhotoSlot {src:string;type:string;x:number;bottom:number;bounds:readonly number[];humanHeight:number;petHeight:number;protected:readonly (readonly number[])[];note:string;}
export function photoSlot(placeId:string,category:string,version:number):PhotoSlot|undefined {
 return version===3&&category==='landmark'?(photoSlots as Record<string,PhotoSlot>)[placeId]:undefined;
}
export function newTemplateVersion(placeId:string):2|3 {return placeId in photoSlots?3:2;}
/** Fits the entire replaceable layer, including waving hands/equipment, in one fixed box. */
export function fitPhotoActor(slot:PhotoSlot,kind:'human'|'pet',id:string,sourceWidth:number,sourceHeight:number,sceneWidth:number,sceneHeight:number){
 const portrait=slot.type==='portrait';
 const crop=portrait?(kind==='pet'?.79:id.startsWith('mira-wave')?.48:id.includes('-sit-')?.75:.50):1;
 const face=portrait?(id.startsWith('mira-wave')?.59:id.startsWith('leo-wave')?.405:.5):.5;
 const sh=Math.max(1,Math.round(sourceHeight*crop));
 const b=slot.bounds, margin=sceneWidth*.004;
 const anchor=sceneWidth*slot.x;
 const maxW=Math.min((anchor-sceneWidth*b[0]-margin)/face,(sceneWidth*b[2]-anchor-margin)/(1-face));
 const maxH=sceneHeight*(slot.bottom-b[1])-margin;
 const scale=Math.max(0,Math.min(sceneHeight*(kind==='pet'?slot.petHeight:slot.humanHeight)/sh,maxH/sh,maxW/sourceWidth));
 const width=sourceWidth*scale,height=sh*scale;
 return {sourceHeight:sh,left:anchor-width*face,top:sceneHeight*slot.bottom-height,width,height};
}
