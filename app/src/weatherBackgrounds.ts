import {weatherBackgrounds} from './weatherBackgrounds.generated.ts';
export type SceneTheme='night'|'rain';
const registry=weatherBackgrounds as Record<string,Partial<Record<SceneTheme,string>>>;
export function availableSceneThemes(placeId:string,category:string,version:number):SceneTheme[]{
 return category==='landmark'&&version===3?(['night','rain'] as const).filter(t=>!!registry[placeId]?.[t]):[];
}
export function weatherBackground(placeId:string,category:string,version:number,theme?:SceneTheme){
 if(!theme)return undefined;
 const src=category==='landmark'&&version===3?registry[placeId]?.[theme]:undefined;
 if(!src)throw Error('这张卡片的天气场景尚未下载或当前版本不支持，请更新后重试。');
 return src;
}
export function weatherImages(placeId:string){return Object.values(registry[placeId]??{});}
