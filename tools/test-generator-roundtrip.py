"""Exercise the actual authenticated queue -> local GPU -> private result flow on localhost."""
import urllib.request,http.cookiejar,json,time,subprocess,os,pathlib,base64
R=pathlib.Path(__file__).resolve().parents[1];origin=os.environ.get('MANYOU_TEST_URL','http://127.0.0.1:8788');opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def api(route,data=None):
 req=urllib.request.Request(origin+'/api/'+route,data=None if data is None else json.dumps(data).encode(),headers={'User-Agent':'manyou-integration-test/0.3',**({} if data is None else {'Content-Type':'application/json'})})
 with opener.open(req,timeout=60) as f:return json.load(f)
u=api('auth/register',dict(username='gpu_test_'+str(int(time.time())),name='GPU integration test',password='Local-GPU-test-passphrase-2026!'))
external=os.environ.get('MANYOU_TEST_SHARED')=='1'
token='' if external else api('generator',{})['token'];ref='data:image/webp;base64,'+base64.b64encode((R/'app/public/companions/v1/mira-stand.webp').read_bytes()).decode()
job=api('jobs',dict(name='小满测试动作',kind='human',prompt='Same young adult traveler, smiling and holding a small travel journal with both hands, full body',reference=ref,characterId='custom-roundtrip'))
env={**os.environ,'MANYOU_URL':origin,'MANYOU_GENERATOR_TOKEN':token,'PYTHONIOENCODING':'utf-8'}
log=(R/'production/jobs/generator-roundtrip.log').open('w',encoding='utf-8')
process=None if external else subprocess.Popen([str(R/'.local/comfy-env/Scripts/python.exe'),str(R/'tools/generator-agent.py')],env=env,stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
try:
 for i in range(100):
  state=next(j for j in api('jobs')['jobs'] if j['id']==job['id'])
  if state['state']=='failed':raise RuntimeError(state['error'])
  if state['state']=='done':
   result=api('jobs/'+job['id']);assert result['image'].startswith('data:image/webp;base64,');assert result['character_id']=='custom-roundtrip'
   (R/'production/generator-roundtrip.webp').write_bytes(base64.b64decode(result['image'].split(',',1)[1]));print('PASS: authenticated job -> real local GPU -> private image result; identity group preserved.',flush=True);break
  if i%5==0:print('GPU roundtrip:',state['state'],flush=True)
  time.sleep(5)
 else:raise TimeoutError('GPU roundtrip not completed')
finally:
 if process:process.terminate();process.wait(timeout=20)
 log.close()
