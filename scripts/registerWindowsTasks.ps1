$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node.exe -ErrorAction Stop).Source
$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$user = "$env:USERDOMAIN\$env:USERNAME"
$backupScript = Join-Path $PSScriptRoot 'secureBackup.js'
$startupScript = Join-Path $PSScriptRoot 'startPm2.ps1'
$profileScript = Join-Path $PSScriptRoot 'profileBackup.ps1'
$legacyStartupShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'yt-members-signal-trader-pm2-resurrect.lnk'

Set-Location -LiteralPath $repo
& $node $backupScript init-key | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "No se pudo inicializar la clave de backup."
}

if (Test-Path -LiteralPath $legacyStartupShortcut -PathType Leaf) {
  [IO.File]::Delete([IO.Path]::GetFullPath($legacyStartupShortcut))
}

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

$startupArguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $startupScript + '"'
$startupAction = New-ScheduledTaskAction -Execute $powershell -Argument $startupArguments -WorkingDirectory $repo
$startupTrigger = New-ScheduledTaskTrigger -AtLogOn -User $user
Register-ScheduledTask `
  -TaskName 'FuturesMagicianPM2Startup' `
  -Action $startupAction `
  -Trigger $startupTrigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Restaura Futures Magician con PM2 al iniciar sesion.' `
  -Force | Out-Null

$backupArguments = '"' + $backupScript + '" create --drill'
$backupAction = New-ScheduledTaskAction -Execute $node -Argument $backupArguments -WorkingDirectory $repo
$backupTrigger = New-ScheduledTaskTrigger -Daily -At 3:15am
Register-ScheduledTask `
  -TaskName 'FuturesMagicianSecureBackup' `
  -Action $backupAction `
  -Trigger $backupTrigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Backup cifrado diario con simulacro de restauracion.' `
  -Force | Out-Null

$profileArguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $profileScript + '"'
$profileAction = New-ScheduledTaskAction -Execute $powershell -Argument $profileArguments -WorkingDirectory $repo
$profileTrigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek Sunday -At 4:00am
Register-ScheduledTask `
  -TaskName 'FuturesMagicianProfileBackup' `
  -Action $profileAction `
  -Trigger $profileTrigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Backup cifrado semanal de datos y perfil Chromium.' `
  -Force | Out-Null

Get-ScheduledTask | Where-Object { $_.TaskName -like 'FuturesMagician*' } | ForEach-Object {
  $info = Get-ScheduledTaskInfo -TaskName $_.TaskName
  [pscustomobject]@{
    TaskName = $_.TaskName
    State = $_.State
    NextRunTime = $info.NextRunTime
    LastTaskResult = $info.LastTaskResult
  }
} | Sort-Object TaskName | Format-Table -AutoSize
