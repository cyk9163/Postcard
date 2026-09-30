export function locate(geo:Pick<Geolocation,'watchPosition'|'clearWatch'>,signal:AbortSignal,onProgress:(message:string)=>void,timeoutMs=35000):Promise<GeolocationPosition>{
 return new Promise((resolve,reject)=>{
  let watch:number|undefined,done=false;
  const finish=(error?:Error,position?:GeolocationPosition)=>{if(done)return;done=true;clearTimeout(timer);if(watch!==undefined)geo.clearWatch(watch);signal.removeEventListener('abort',abort);error?reject(error):resolve(position!);};
  const abort=()=>finish(new DOMException('已取消定位','AbortError'));
  const timer=setTimeout(()=>finish(Error('定位等待超时。请确认浏览器已获准使用位置；可以重试，或选择手动记录。')),timeoutMs);
  if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});
  onProgress('正在获取位置，请保持页面打开；首次定位可能需要约半分钟。');
  try{watch=geo.watchPosition(position=>{
   const c=position.coords,age=Date.now()-position.timestamp;
   if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||Math.abs(c.latitude)>90||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0||!Number.isFinite(age)||age>30000||age< -5000)return;
   if(c.accuracy>100){onProgress(`已获取大致位置（误差约 ${Math.round(c.accuracy)} 米），正在等待更准确的位置…`);return;}
   finish(undefined,position);
  },error=>{
   if(error.code===1)finish(Error('定位权限未开启。请在系统与浏览器设置中允许此网站使用位置，或选择手动记录。'));
   else onProgress('暂未获得准确位置，仍在尝试；可以取消后手动记录。');
  },{enableHighAccuracy:true,timeout:10000,maximumAge:15000});
  // Also handles synchronous callbacks in adapters and test doubles.
  if(done&&watch!==undefined)geo.clearWatch(watch);
  }catch(error){finish(error instanceof Error?error:Error('暂时无法使用定位，请重试或手动记录。'));}
 });
}
