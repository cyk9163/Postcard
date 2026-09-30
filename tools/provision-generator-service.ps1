$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$taskBytes=New-Object byte[] 32
$taskRandom=[Security.Cryptography.RandomNumberGenerator]::Create()
$taskRandom.GetBytes($taskBytes);$taskRandom.Dispose()
$taskToken=([BitConverter]::ToString($taskBytes)).Replace('-','').ToLowerInvariant()
$taskHash=([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($taskToken)))).Replace('-','').ToLowerInvariant()
$taskExpiry=[DateTimeOffset]::UtcNow.AddDays(30).ToUnixTimeMilliseconds()
$taskSql=Join-Path $projectRoot '.local/generator-service.sql'
"DELETE FROM generators WHERE owner='__service__'; INSERT INTO generators(hash,owner,expires) VALUES ('$taskHash','__service__',$taskExpiry);" | Set-Content -LiteralPath $taskSql -Encoding ASCII
Push-Location (Join-Path $projectRoot 'app')
try { & node node_modules/wrangler/bin/wrangler.js d1 execute manyou-data --remote --file $taskSql --yes; if($LASTEXITCODE -ne 0){throw 'Could not register the service key.'} }
finally { Pop-Location }
$taskEncrypted=ConvertTo-SecureString $taskToken -AsPlainText -Force | ConvertFrom-SecureString
@{url='https://manyou-melbourne.pages.dev';encryptedToken=$taskEncrypted;expires=$taskExpiry} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $projectRoot '.local/generator-service.json') -Encoding UTF8
$taskToken=$null
Write-Output 'Service paired for 30 days. Key encrypted for this Windows user. Run tools/start-generator-service.ps1.'
