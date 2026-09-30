$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$pythonPath = Join-Path $projectRoot '.local/comfy-env/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Run tools/setup-comfy.py first.' }
Push-Location (Join-Path $projectRoot '.local/ComfyUI')
try { & $pythonPath main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch --reserve-vram 2 }
finally { Pop-Location }
