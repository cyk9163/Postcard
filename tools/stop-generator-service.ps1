$ErrorActionPreference='Stop'
$taskPidFile=Join-Path (Split-Path $PSScriptRoot -Parent) '.local/generator-service.pid'
if(Test-Path -LiteralPath $taskPidFile){$taskWorkerId=[int](Get-Content -LiteralPath $taskPidFile);$taskWorker=Get-CimInstance Win32_Process -Filter "ProcessId=$taskWorkerId" -ErrorAction SilentlyContinue;if($taskWorker -and $taskWorker.CommandLine -like '*generator-agent.py*'){Stop-Process -Id $taskWorkerId;Write-Output 'Generator worker stopped. Website and saved cards stay available.'}}
