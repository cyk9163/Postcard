$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$env:MANYOU_URL=Read-Host 'Website URL (for example https://manyou-melbourne.pages.dev)'
$taskSecret=Read-Host 'Generator connection code from the app' -AsSecureString
$taskPtr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)
try {$env:MANYOU_GENERATOR_TOKEN=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPtr); & (Join-Path $projectRoot '.local/comfy-env/Scripts/python.exe') (Join-Path $PSScriptRoot 'generator-agent.py')}
finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPtr);Remove-Item Env:MANYOU_GENERATOR_TOKEN -ErrorAction SilentlyContinue;Remove-Item Env:MANYOU_URL -ErrorAction SilentlyContinue}
