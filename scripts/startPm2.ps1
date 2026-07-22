$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$processName = 'yt-members-signal-trader'
$pm2 = (Get-Command pm2.cmd -ErrorAction Stop).Source
$startupMutex = [Threading.Mutex]::new($false, 'Local\FuturesMagicianPM2Startup')
$lockTaken = $false

try {
  try {
    $lockTaken = $startupMutex.WaitOne([TimeSpan]::FromSeconds(30))
  } catch [Threading.AbandonedMutexException] {
    $lockTaken = $true
  }

  if (-not $lockTaken) {
    return
  }

  Set-Location -LiteralPath $repo
  & $pm2 resurrect | Out-Null
  Start-Sleep -Seconds 2

  $pidText = (& $pm2 pid $processName | Select-Object -Last 1).Trim()
  if ($pidText -notmatch '^\d+$' -or [int]$pidText -le 0) {
    & $pm2 start ecosystem.config.cjs --only $processName | Out-Null
  }

  & $pm2 save --force | Out-Null
} finally {
  if ($lockTaken) {
    $startupMutex.ReleaseMutex()
  }
  $startupMutex.Dispose()
}
