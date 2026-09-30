"""Install a pinned official ComfyUI checkout in an isolated project directory."""
import json, pathlib, subprocess, sys, urllib.request, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.local'
LOCAL.mkdir(exist_ok=True)
req = urllib.request.Request('https://api.github.com/repos/Comfy-Org/ComfyUI/commits/master', headers={'User-Agent': 'Postcard-local-setup'})
commit = json.load(urllib.request.urlopen(req, timeout=60))['sha']
target = LOCAL / 'ComfyUI'
if not (target / 'main.py').exists():
    archive = LOCAL / 'comfy-source.zip'
    urllib.request.urlretrieve(f'https://codeload.github.com/Comfy-Org/ComfyUI/zip/{commit}', archive)
    with zipfile.ZipFile(archive) as z:
        for entry in z.infolist():
            parts = pathlib.PurePosixPath(entry.filename).parts[1:]
            if not parts: continue
            dest = target.joinpath(*parts).resolve()
            if not dest.is_relative_to(target.resolve()): raise ValueError('Invalid archive path')
            if entry.is_dir(): dest.mkdir(parents=True, exist_ok=True)
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(z.read(entry))
    (LOCAL / 'comfy-source.json').write_text(json.dumps({'repository':'https://github.com/Comfy-Org/ComfyUI', 'commit':commit}, indent=2))
print('Official ComfyUI source ready', flush=True)
venv = LOCAL / 'comfy-env'
python = venv / 'Scripts' / 'python.exe'
if not python.exists(): subprocess.run([sys.executable, '-m', 'venv', str(venv)], check=True)
subprocess.run([str(python), '-m', 'pip', 'install', '--disable-pip-version-check', 'torch', 'torchvision', 'torchaudio', '--index-url', 'https://download.pytorch.org/whl/cu130'], check=True)
subprocess.run([str(python), '-m', 'pip', 'install', '--disable-pip-version-check', '-r', str(target / 'requirements.txt')], check=True)
subprocess.run([str(python), '-c', 'import torch; print("CUDA:", torch.cuda.is_available()); print(torch.cuda.get_device_name(0)); print(torch.ones(1,device="cuda")*2)'], check=True)
print('Local GPU environment ready.', flush=True)
