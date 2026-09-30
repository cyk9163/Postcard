import {distanceMeters,type Visit} from './domain.ts';
export interface TrackPoint{lat:number;lng:number;at:number;accuracy:number;break?:boolean}
export interface Walk{id:string;startedAt:number;endedAt?:number;points:TrackPoint[]}
export interface Reward{id:string;at:number}
export const rewards=[{id:'pose-camera',name:'举起相机',cost:30},{id:'pose-sit',name:'坐着歇一歇',cost:60},{id:'style-sunset',name:'落日暖光',cost:40},{id:'style-vintage',name:'旧日胶片',cost:80}];
export function pointsEarned(visits:Visit[],walks:Walk[]){const places=new Set(visits.map(v=>v.placeId)).size;const days=new Set(walks.filter(w=>w.endedAt&&walkDistance(w)>=200).map(w=>new Date(w.startedAt).toISOString().slice(0,10))).size;return places*20+days*10;}
export function walkDistance(w:Walk){return w.points.reduce((sum,p,i)=>i&&!p.break?sum+distanceMeters(p.lat,p.lng,w.points[i-1].lat,w.points[i-1].lng):sum,0);}
export function acceptPoint(points:TrackPoint[],p:TrackPoint){if(!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lng)||Math.abs(p.lng)>180||!Number.isFinite(p.at)||!Number.isFinite(p.accuracy)||p.accuracy<0||p.accuracy>80)return false;const prev=points.at(-1);if(!prev)return true;const secs=(p.at-prev.at)/1000,distance=distanceMeters(p.lat,p.lng,prev.lat,prev.lng);return secs>=3&&distance>=8&&distance/secs<12;}
export function validateWalk(w:Walk){if(!w||typeof w.id!=='string'||w.id.length>100||!Number.isFinite(w.startedAt)||!Array.isArray(w.points)||w.points.length>20000||w.points.some(p=>!acceptPoint([],p))||(w.endedAt!==undefined&&(!Number.isFinite(w.endedAt)||w.endedAt<w.startedAt)))throw Error('轨迹数据不正确');return w;}

export function trackSegments(points:TrackPoint[]){const segments:TrackPoint[][]=[];for(const p of points){if(!segments.length||p.break)segments.push([]);segments.at(-1)!.push(p);}return segments;}
