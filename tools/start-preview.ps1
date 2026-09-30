$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$nodePath = (Get-Command node -ErrorAction Stop).Source
$vitePath = Join-Path $projectRoot 'app/node_modules/vite/bin/vite.js'
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'app/dist/index.html'))) { throw 'Build the app first (pnpm build in app).' }
Push-Location (Join-Path $projectRoot 'app')
try { & $nodePath $vitePath preview --host 127.0.0.1 --port 4173 --strictPort }
finally { Pop-Location }
