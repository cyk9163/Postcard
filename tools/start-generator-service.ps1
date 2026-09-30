$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$taskConfig=Get-Content -LiteralPath (Join-Path $projectRoot '.local/generator-service.json') -Raw | ConvertFrom-Json
if($taskConfig.expires -lt [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()){throw 'Service key expired. Run provision-generator-service.ps1.'}
$taskPidFile=Join-Path $projectRoot '.local/generator-service.pid'
if(Test-Path -LiteralPath $taskPidFile){$taskOldId=[int](Get-Content -LiteralPath $taskPidFile);$taskOld=Get-CimInstance Win32_Process -Filter "ProcessId=$taskOldId" -ErrorAction SilentlyContinue;if($taskOld -and $taskOld.CommandLine -like '*generator-agent.py*'){Write-Output 'Generator service is already running.';exit}}
try { $null=Invoke-RestMethod 'http://127.0.0.1:8188/system_stats' -TimeoutSec 3 }
catch { $taskComfy=Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File', ('"'+(Join-Path $PSScriptRoot 'start-comfy.ps1')+'"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.local/comfy-service.log') -RedirectStandardError (Join-Path $projectRoot '.local/comfy-service-error.log') -PassThru; Write-Output 'Starting the local image model.' }
$taskSecret=ConvertTo-SecureString $taskConfig.encryptedToken
$taskPtr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)
try {
 $env:MANYOU_URL=$taskConfig.url;$env:MANYOU_GENERATOR_TOKEN=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPtr)
 $taskWorker=Start-Process (Join-Path $projectRoot '.local/comfy-env/Scripts/python.exe') -ArgumentList @('-u',('"'+(Join-Path $PSScriptRoot 'generator-agent.py')+'"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.local/generator-service.log') -RedirectStandardError (Join-Path $projectRoot '.local/generator-service-error.log') -PassThru
 $taskWorker.Id | Set-Content -LiteralPath $taskPidFile
 Write-Output 'Generator service started in the background. Only outgoing HTTPS; ComfyUI stays local.'
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPtr);Remove-Item Env:MANYOU_GENERATOR_TOKEN -ErrorAction SilentlyContinue;Remove-Item Env:MANYOU_URL -ErrorAction SilentlyContinue }
