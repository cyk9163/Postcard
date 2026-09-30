import type {Category} from './content.ts';
export type PositionTag='left'|'center'|'right'|'any';
export interface Anchor {tag:Exclude<PositionTag,'any'>;x:number;y:number;width:number;}
export interface CardLayout {version:1;human:boolean;anchors:Anchor[];review:'baseline'|'curated';humanNote?:string;}
// Coordinates are normalized to the rendered card; y is the character's feet.
// Existing saved compositions remain numeric snapshots and are never reflowed.
const positions={left:.17,center:.5,right:.83};
const aerial=new Set(['tokyo-shibuya','tokyo-skytree','new-york-central-park','dubai-palm']);
const rightFirst=new Set(['sydney-qvb','florence-ponte-vecchio','paris-orsay']);
const centerFirst=new Set(['kyoto-bamboo']);
// Per-image overrides take precedence over the provisional family layout.
// Add reviewed slots here when a new reference image is approved.
export const cardLayoutOverrides:Record<string,CardLayout>={
 'flinders:landmark':{version:1,human:true,review:'curated',anchors:[{tag:'right',x:.83,y:.97,width:.25}]},
 'flinders:atmosphere':{version:1,human:true,review:'curated',anchors:[{tag:'right',x:.82,y:.96,width:.24}]},
 'flinders:detail':{version:1,human:false,review:'curated',humanNote:'这张是钟楼特写，没有适合站立的地面。保留风景，换一张全景再合影吧。',anchors:[{tag:'right',x:.83,y:.97,width:.22}]},
 'tokyo-sensoji:landmark':{version:1,human:true,review:'curated',anchors:[{tag:'left',x:.35,y:.96,width:.23},{tag:'right',x:.67,y:.96,width:.23}]},
 'tokyo-sensoji:atmosphere':{version:1,human:true,review:'curated',anchors:[{tag:'left',x:.35,y:.96,width:.23},{tag:'right',x:.68,y:.96,width:.23}]},
 'tokyo-sensoji:detail':{version:1,human:true,review:'curated',anchors:[{tag:'left',x:.38,y:.93,width:.21},{tag:'right',x:.64,y:.93,width:.21}]},
 'paris-eiffel:landmark':{version:1,human:true,review:'curated',anchors:[{tag:'left',x:.23,y:.96,width:.24},{tag:'right',x:.77,y:.96,width:.24}]},
 'paris-eiffel:atmosphere':{version:1,human:true,review:'curated',anchors:[{tag:'left',x:.24,y:.96,width:.24},{tag:'right',x:.77,y:.96,width:.24}]},
 'paris-eiffel:detail':{version:1,human:false,review:'curated',humanNote:'这张是铁塔特写，前景没有完整的站立空间。保留风景，换一张全景再合影吧。',anchors:[{tag:'left',x:.23,y:.97,width:.22}]},

 'kyoto-bamboo:landmark':{version:1,human:true,review:'curated',anchors:[{tag:'center',x:.5,y:.98,width:.27}]},
 'kyoto-bamboo:atmosphere':{version:1,human:true,review:'curated',anchors:[{tag:'center',x:.5,y:.98,width:.26}]},
 'kyoto-bamboo:detail':{version:1,human:true,review:'curated',anchors:[{tag:'center',x:.5,y:.98,width:.24}]},
 "sydney-opera:landmark":{"version":1,"human":false,"review":"curated","humanNote":"这张从水面远眺歌剧院，没有人物落脚的前景。先留一张风景纪念吧。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "sydney-opera:atmosphere":{"version":1,"human":false,"review":"curated","humanNote":"这张从水面远眺歌剧院，没有人物落脚的前景。先留一张风景纪念吧。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "sydney-opera:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张从水面远眺歌剧院，没有人物落脚的前景。先留一张风景纪念吧。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "sydney-bondi:landmark":{"version":1,"human":false,"review":"curated","humanNote":"这张是俯瞰海湾的视角，不适合站立合影。保留完整的海岸风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "sydney-bondi:atmosphere":{"version":1,"human":false,"review":"curated","humanNote":"这张是俯瞰海湾的视角，不适合站立合影。保留完整的海岸风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "sydney-bondi:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张是俯瞰海湾的视角，不适合站立合影。保留完整的海岸风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "london-tower-bridge:landmark":{"version":1,"human":false,"review":"curated","humanNote":"这张前景是河面，没有合适的站位。保留桥梁与倒影。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "london-tower-bridge:atmosphere":{"version":1,"human":false,"review":"curated","humanNote":"这张前景是河面，没有合适的站位。保留桥梁与倒影。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "london-tower-bridge:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张前景是河面，没有合适的站位。保留桥梁与倒影。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "kyoto-kiyomizu:landmark":{"version":1,"human":false,"review":"curated","humanNote":"这张从山林远望清水寺，没有近处地面。先收藏这片风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "kyoto-kiyomizu:atmosphere":{"version":1,"human":false,"review":"curated","humanNote":"这张从山林远望清水寺，没有近处地面。先收藏这片风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "kyoto-kiyomizu:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张从山林远望清水寺，没有近处地面。先收藏这片风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "singapore-botanic:landmark":{"version":1,"human":false,"review":"curated","humanNote":"这张前景是湖水与植物，没有完整步道。保留湖畔风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "singapore-botanic:atmosphere":{"version":1,"human":false,"review":"curated","humanNote":"这张前景是湖水与植物，没有完整步道。保留湖畔风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "singapore-botanic:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张前景是湖水与植物，没有完整步道。保留湖畔风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "singapore-merlion:landmark":{"version":1,"human":false,"review":"curated","humanNote":"这张以鱼尾狮和水景为主，没有完整的合影地面。保留地标全貌。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "singapore-merlion:atmosphere":{"version":1,"human":false,"review":"curated","humanNote":"这张以鱼尾狮和水景为主，没有完整的合影地面。保留地标全貌。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "singapore-merlion:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张以鱼尾狮和水景为主，没有完整的合影地面。保留地标全貌。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "london-big-ben:landmark":{"version":1,"human":false,"review":"curated","humanNote":"这张以钟楼为主，没有足够的近处站立空间。先保留风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "london-big-ben:atmosphere":{"version":1,"human":false,"review":"curated","humanNote":"这张以钟楼为主，没有足够的近处站立空间。先保留风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "london-big-ben:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张以钟楼为主，没有足够的近处站立空间。先保留风景。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "rome-colosseum:landmark":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.2}]},
 "rome-colosseum:atmosphere":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.2}]},
 "rome-colosseum:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张是建筑近景，画面边缘没有完整地面。换一张全景再合影吧。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "rome-pantheon:landmark":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.2}]},
 "rome-pantheon:atmosphere":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.2}]},
 "rome-pantheon:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张是建筑近景，画面边缘没有完整地面。换一张全景再合影吧。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "rome-navona:landmark":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"right","x":0.81,"y":0.96,"width":0.2}]},
 "rome-navona:atmosphere":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"right","x":0.81,"y":0.96,"width":0.2}]},
 "rome-navona:detail":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"right","x":0.81,"y":0.96,"width":0.18}]},
 "tokyo-meiji:landmark":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"left","x":0.28,"y":0.96,"width":0.23},{"tag":"right","x":0.73,"y":0.96,"width":0.23}]},
 "tokyo-meiji:atmosphere":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"left","x":0.28,"y":0.96,"width":0.23},{"tag":"right","x":0.73,"y":0.96,"width":0.23}]},
 "tokyo-meiji:detail":{"version":1,"human":false,"review":"curated","humanNote":"这张是殿门近景，没有完整的前景站位。换一张全景再合影吧。","anchors":[{"tag":"left","x":0.22,"y":0.97,"width":0.22}]},
 "london-buckingham:landmark":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"left","x":0.27,"y":0.97,"width":0.22},{"tag":"right","x":0.74,"y":0.97,"width":0.22}]},
 "london-buckingham:atmosphere":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"left","x":0.27,"y":0.97,"width":0.22},{"tag":"right","x":0.74,"y":0.97,"width":0.22}]},
 "london-buckingham:detail":{"version":1,"human":true,"review":"curated","anchors":[{"tag":"left","x":0.27,"y":0.97,"width":0.22},{"tag":"right","x":0.74,"y":0.97,"width":0.22}]},
};
export function cardLayout(placeId:string,category:Category):CardLayout {
 if(cardLayoutOverrides[`${placeId}:${category}`])return cardLayoutOverrides[`${placeId}:${category}`];
 const preferred=rightFirst.has(placeId)?'right':centerFirst.has(placeId)?'center':'left';
 const tags:Exclude<PositionTag,'any'>[]=preferred==='center'?['center','left','right']:preferred==='right'?['right','left']:['left','right'];
 return {version:1,human:!aerial.has(placeId),review:rightFirst.has(placeId)||centerFirst.has(placeId)||aerial.has(placeId)?'curated':'baseline',anchors:tags.map(tag=>({tag,x:positions[tag],y:.98,width:category==='detail'?.24:.28}))};
}
