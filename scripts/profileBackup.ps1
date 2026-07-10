$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$processName = 'yt-members-signal-trader'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$pm2 = (Get-Command pm2.cmd -ErrorAction Stop).Source
$backupScript = Join-Path $PSScriptRoot 'secureBackup.js'
$wasRunning = $false

Set-Location -LiteralPath $repo

try {
  $pidText = (& $pm2 pid $processName | Select-Object -Last 1).Trim()
  $wasRunning = $pidText -match '^\d+$' -and [int]$pidText -gt 0
  if ($wasRunning) {
    & $pm2 stop $processName | Out-Null
    Start-Sleep -Seconds 3
  }

  & $node $backupScript create --include-profile
  if ($LASTEXITCODE -ne 0) {
    throw "El backup cifrado del perfil terminó con código $LASTEXITCODE."
  }
} finally {
  if ($wasRunning) {
    & $pm2 start ecosystem.config.cjs --only $processName | Out-Null
    & $pm2 save --force | Out-Null
  }
}
