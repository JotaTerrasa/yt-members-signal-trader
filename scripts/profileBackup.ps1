$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$processName = 'yt-members-signal-trader'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$pm2 = (Get-Command pm2.cmd -ErrorAction Stop).Source
$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$backupScript = Join-Path $PSScriptRoot 'secureBackup.js'
$startupScript = Join-Path $PSScriptRoot 'startPm2.ps1'
$wasRunning = $false

Set-Location -LiteralPath $repo

function Get-FuturesMagicianPid {
  $output = @(& $pm2 pid $processName)
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo consultar el proceso de Futures Magician en PM2."
  }

  $candidate = [string]($output | Select-Object -Last 1)
  if ($candidate.Trim() -match '^\d+$') {
    return [int]$candidate.Trim()
  }
  return 0
}

try {
  $wasRunning = (Get-FuturesMagicianPid) -gt 0
  if ($wasRunning) {
    & $pm2 stop $processName | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "No se pudo detener Futures Magician antes del backup del perfil."
    }

    $stopDeadline = [DateTimeOffset]::UtcNow.AddSeconds(30)
    while ((Get-FuturesMagicianPid) -gt 0 -and [DateTimeOffset]::UtcNow -lt $stopDeadline) {
      Start-Sleep -Seconds 1
    }
    if ((Get-FuturesMagicianPid) -gt 0) {
      throw "Futures Magician sigue activo 30 segundos despues de solicitar la parada."
    }
  }

  & $node $backupScript create --include-profile --drill
  if ($LASTEXITCODE -ne 0) {
    throw "El backup cifrado del perfil terminó con código $LASTEXITCODE."
  }
} finally {
  if ($wasRunning) {
    & $powershell -NoProfile -ExecutionPolicy Bypass -File $startupScript
    if ($LASTEXITCODE -ne 0) {
      throw "No se pudo restaurar Futures Magician y confirmar su salud despues del backup."
    }
  }
}
