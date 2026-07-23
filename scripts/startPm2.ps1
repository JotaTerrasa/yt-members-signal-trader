$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$processName = 'yt-members-signal-trader'
$pm2 = (Get-Command pm2.cmd -ErrorAction Stop).Source
$port = if ($env:PORT -match '^\d+$') { [int]$env:PORT } else { 5178 }
$startupMutex = [Threading.Mutex]::new($false, 'Local\FuturesMagicianPM2Startup')
$lockTaken = $false

function Wait-FuturesMagicianHealth {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$TimeoutSeconds = 90
  )

  $healthUrl = "http://127.0.0.1:$Port/api/health"
  $deadline = [DateTimeOffset]::UtcNow.AddSeconds($TimeoutSeconds)
  $lastError = 'sin respuesta'

  do {
    try {
      $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 5
      if ($response.ok -eq $true -and $response.runtime.id) {
        return
      }
      $lastError = 'respuesta sin ok o sin identificador de runtime'
    } catch {
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Seconds 2
  } while ([DateTimeOffset]::UtcNow -lt $deadline)

  throw "Futures Magician no supero /api/health en $TimeoutSeconds segundos: $lastError"
}

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

  & $pm2 startOrReload ecosystem.config.cjs --only $processName --update-env | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo aplicar el ecosistema saneado de PM2."
  }

  Wait-FuturesMagicianHealth -Port $port

  & $pm2 save --force | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "PM2 arranco la aplicacion, pero no pudo guardar el estado restaurable."
  }
} finally {
  if ($lockTaken) {
    $startupMutex.ReleaseMutex()
  }
  $startupMutex.Dispose()
}
