from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/src/App.tsx'
s=p.read_text(encoding='utf-8')
s=s.replace("&&!import.meta.url.includes('localhost:5173')", "&&location.port!=='5173'")
s=s.replace('{i+1}<span>{p.name}</span></button>', '{i+1}</button>')
s=s.replace('<span className="map-key">● 已到访　○ 待探索</span></div></section>', '<span className="map-key">● 已到访　○ 待探索</span></div><div className="map-legend">{places.map((p,i)=><button key={p.id} onClick={()=>setSelected(p)}><span>{i+1}</span>{p.name}</button>)}</div></section>')
s=s.replace('只在你点击时定位；手动记录会单独标注。','只在你点击时定位；手动记录会单独标注。')
s=s.replace('草稿自动保存在此设备</p>','草稿自动保存在此设备；导出时文字会自动连续排版。</p>')
p.write_text(s,encoding='utf-8')
p=root/'app/src/content.ts';s=p.read_text(encoding='utf-8')
s=s.replace('-37.8183,lng:144.9671','-37.818078,lng:144.966811').replace('-37.8179,lng:144.9690','-37.817797,lng:144.968714').replace('-37.8304,lng:144.9796','-37.830361,lng:144.979611').replace('-37.8305,lng:144.9734','-37.830556,lng:144.973444').replace('-37.8098,lng:144.9652','-37.8098,lng:144.965')
p.write_text(s,encoding='utf-8')
