$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$nodeRuntime = 'C:/Users/yc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$pythonRuntime = 'C:/Users/yc/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
Set-Location -LiteralPath $repo
& $pythonRuntime tools/review-chat-backgrounds.py
if ($LASTEXITCODE -ne 0) { throw 'Slot review failed' }
& $pythonRuntime tools/stage-chat-backgrounds.py
if ($LASTEXITCODE -ne 0) { throw 'Staging failed' }
# This directory contains only rebuildable outputs created by this script.
$target = [IO.Path]::GetFullPath((Join-Path $repo 'tmp/chat-release-current'))
$expected = [IO.Path]::GetFullPath((Join-Path $repo 'tmp')) + [IO.Path]::DirectorySeparatorChar
if (-not $target.StartsWith($expected,[StringComparison]::OrdinalIgnoreCase)) { throw 'Output escaped workspace tmp' }
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
Set-Location -LiteralPath (Join-Path $repo 'app')
& $nodeRuntime node_modules/typescript/bin/tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw 'Type check failed' }
& $nodeRuntime --experimental-strip-types --test tests/photo-slots.test.ts
if ($LASTEXITCODE -ne 0) { throw 'Slot tests failed' }
& $nodeRuntime node_modules/vite/bin/vite.js build --outDir $target
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
& $nodeRuntime ../tools/build-manifest.mjs $target
if ($LASTEXITCODE -ne 0) { throw 'Manifest failed' }
& $nodeRuntime ../tools/build-worker.mjs $target
if ($LASTEXITCODE -ne 0) { throw 'Worker build failed' }
