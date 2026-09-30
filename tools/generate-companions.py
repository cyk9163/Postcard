"""Local-only starter stickers. Uses the project's installed ComfyUI and model."""
import argparse,importlib.util,json,pathlib,shutil,time
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('cards',ROOT/'tools/generate-cards.py');cards=importlib.util.module_from_spec(spec);spec.loader.exec_module(cards)
DESIGNS={
 'mira':'a young adult woman with a chestnut bob haircut, blush pink cardigan, cream floral midi skirt, canvas tote bag',
 'leo':'a young adult man with short tousled black hair, blue open overshirt over a cream t-shirt, olive trousers, navy backpack',
 'iris':'a young adult woman with a dark braided ponytail, round glasses, sage green dungarees and terracotta shirt',
 'noah':'a young adult man with curly brown hair, round glasses, ochre sweater and dark brown trousers, crossbody travel bag',
 'luna':'a young adult woman with a long black ponytail, blue bucket hat, lilac jacket and navy pleated skirt, little camera',
 'kai':'a young adult man with short auburn hair, beige beanie, forest green jacket, cream trousers and sneakers',
 'mikan':'one cute orange tabby kitten with white paws, large warm amber eyes, red collar with a tiny gold bell',
 'mugi':'one cute cream shiba inu puppy with tan ears, dark eyes and a sage green neckerchief',
}
def generate(identity,pose):
 animal=identity in ['mikan','mugi'];seed=2026091200+list(DESIGNS).index(identity)*10+['stand','wave','camera','sit'].index(pose)
 action=('sitting calmly with a friendly smile' if animal else 'standing, full body head to shoes, relaxed friendly travel pose') if pose=='stand' else ('playfully lifting one front paw toward the viewer' if animal else 'waving one hand with a cheerful smile, full body head to shoes')
 if pose=='camera':action='standing full body, holding one little camera with both hands in front of the chest, exactly two arms, friendly smile'
 if pose=='sit':action='sitting cross legged on the ground, relaxed gentle smile, hands resting on knees, exactly two arms, fully visible head to shoes'
 prompt=f'Single isolated die cut character sticker of {DESIGNS[identity]}, {action}. Gentle Japanese anime travel illustration, detailed expressive face, soft watercolor shading, clean fine ink outlines. Fully visible subject centered with generous empty margin on all sides. Pure solid white background, no scenery, no shadow on ground, no words, no other people or animals, no panels.'
 graph=cards.workflow('actor-'+identity,seed,'watercolor anime')
 if pose=='stand':
  for n in ['4','5','6','7','10','11']:del graph[n]
  graph['12']['inputs'].update(positive=['8',0],negative=['9',0])
  graph['15']['inputs'].update(width=640,height=896)
  graph['16']['inputs'].update(width=640,height=896)
 else:prompt+=' Match the exact identity, face, hair, clothes and colors of the reference character. Change only the pose.'
 if identity=='luna' and pose=='wave':prompt+=' Exactly two arms and two hands: replace the camera-holding hand with a raised waving hand. The other arm hangs at her side. The camera hangs freely from a neck strap with NO hand holding it. No extra limbs.'
 graph['8']['inputs']['text']=prompt
 graph['19']['inputs']['filename_prefix']=f'companions/{identity}-{pose}'
 start=time.time();pid=cards.request('/prompt',{'prompt':graph})['prompt_id'];print('Generating',identity,pose,pid,flush=True)
 target=ROOT/f'production/jobs/companion-{identity}-{pose}.json'
 target.write_text(json.dumps({'prompt_id':pid,'workflow':graph}),encoding='utf-8')
 while time.time()-start<900:
  result=cards.request('/history/'+pid).get(pid)
  if result:
   if result['status']['status_str']!='success':raise RuntimeError(str(result['status']))
   output=result['outputs']['19']['images'][0];path=ROOT/'.local/ComfyUI/output'/output['subfolder']/output['filename']
   target.write_text(json.dumps({'prompt_id':pid,'workflow':graph,'output':str(path.relative_to(ROOT)),'elapsedSeconds':round(time.time()-start,2),'status':'success'},indent=2),encoding='utf-8')
   if pose=='stand':shutil.copy2(path,ROOT/f'.local/ComfyUI/input/actor-{identity}.png')
   print('Done',identity,pose,flush=True);return
  time.sleep(2)
 raise TimeoutError(pid)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--ids',nargs='+',default=list(DESIGNS));p.add_argument('--pose',choices=['stand','wave','camera','sit'],default='stand');a=p.parse_args()
 for identity in a.ids:generate(identity,a.pose)
