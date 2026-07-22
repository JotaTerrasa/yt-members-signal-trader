param(
  [ValidateSet('Check', 'Apply')]
  [string]$Mode = 'Check',
  [string]$Root
)

$ErrorActionPreference = 'Stop'

if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') {
  throw 'Este script protege ACL de Windows. En Linux/macOS usa chmod 700 para directorios y chmod 600 para archivos.'
}

$defaultProjectRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$projectRoot = if ($Root) {
  [System.IO.Path]::GetFullPath($Root)
} else {
  $defaultProjectRoot
}
$isLiveRoot = $projectRoot.Equals($defaultProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)
$currentIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$currentSid = $currentIdentity.User.Value
$allowedSids = @(
  $currentSid,
  'S-1-5-18',
  'S-1-5-32-544'
)
$targets = @(
  @{ Path = (Join-Path $projectRoot '.data'); Kind = 'directory' },
  @{ Path = (Join-Path $projectRoot '.yt-profile'); Kind = 'directory' },
  @{ Path = (Join-Path $projectRoot '.env'); Kind = 'file' }
)

function Set-PrivateAcl {
  param(
    [Parameter(Mandatory)] [string]$Path,
    [Parameter(Mandatory)] [string]$Kind,
    [Parameter(Mandatory)] [string[]]$AllowedSids
  )

  $originalAcl = Get-Acl -LiteralPath $Path
  $originalSddl = $originalAcl.Sddl
  try {
    $acl = Get-Acl -LiteralPath $Path
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($rule in @($acl.Access)) {
      [void]$acl.RemoveAccessRuleAll($rule)
    }

    foreach ($sidValue in $AllowedSids) {
      $sid = [System.Security.Principal.SecurityIdentifier]::new($sidValue)
      $inheritance = if ($Kind -eq 'directory') {
        [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
      } else {
        [System.Security.AccessControl.InheritanceFlags]::None
      }
      $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
        $sid,
        [System.Security.AccessControl.FileSystemRights]::FullControl,
        $inheritance,
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow
      )
      [void]$acl.AddAccessRule($rule)
    }
    Set-Acl -LiteralPath $Path -AclObject $acl

    if ($Kind -eq 'directory' -and (Get-ChildItem -LiteralPath $Path -Force -ErrorAction Stop | Select-Object -First 1)) {
      & icacls (Join-Path $Path '*') /reset /T /C /Q 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) {
        throw "icacls no pudo propagar la ACL en $Path (codigo $LASTEXITCODE)."
      }
    }

    $state = Get-PrivateAclState -Path $Path -AllowedSids $AllowedSids
    if (-not $state.secure) {
      throw "La ACL resultante no es privada en $Path."
    }
    Assert-ReadableWritable -Path $Path -Kind $Kind
  } catch {
    $restoreAcl = Get-Acl -LiteralPath $Path
    $restoreAcl.SetSecurityDescriptorSddlForm($originalSddl)
    Set-Acl -LiteralPath $Path -AclObject $restoreAcl
    if ($Kind -eq 'directory' -and (Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue | Select-Object -First 1)) {
      & icacls (Join-Path $Path '*') /reset /T /C /Q 2>&1 | Out-Null
    }
    throw
  }
}

function Get-PrivateAclState {
  param(
    [Parameter(Mandatory)] [string]$Path,
    [Parameter(Mandatory)] [string[]]$AllowedSids
  )

  $acl = Get-Acl -LiteralPath $Path
  $allowSids = @($acl.Access | Where-Object {
    $_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow
  } | ForEach-Object {
    $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
  } | Sort-Object -Unique)
  $denyCount = @($acl.Access | Where-Object {
    $_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Deny
  }).Count
  $unexpected = @($allowSids | Where-Object { $_ -notin $AllowedSids })
  $currentSid = $AllowedSids[0]
  $hasCurrentUser = $currentSid -in $allowSids
  $secure = $acl.AreAccessRulesProtected -and $hasCurrentUser -and $unexpected.Count -eq 0 -and $denyCount -eq 0

  return [pscustomobject]@{
    path = $Path
    exists = $true
    protected = $acl.AreAccessRulesProtected
    secure = $secure
    unexpectedAccessCount = $unexpected.Count
  }
}

function Test-Pm2AppRunning {
  $pm2 = Get-Command pm2.cmd -ErrorAction SilentlyContinue
  if (-not $pm2) {
    return $false
  }
  $pidText = (& $pm2.Source pid yt-members-signal-trader 2>$null | Select-Object -Last 1)
  return ([string]$pidText).Trim() -match '^\d+$' -and [int]([string]$pidText).Trim() -gt 0
}

function Assert-ReadableWritable {
  param(
    [Parameter(Mandatory)] [string]$Path,
    [Parameter(Mandatory)] [string]$Kind
  )

  if ($Kind -eq 'file') {
    $stream = [System.IO.File]::Open($Path, 'Open', 'Read', 'ReadWrite')
    $stream.Dispose()
    return
  }

  $probe = Join-Path $Path ('.acl-probe-' + [guid]::NewGuid().ToString('N'))
  try {
    [System.IO.File]::WriteAllText($probe, 'ok')
    if ([System.IO.File]::ReadAllText($probe) -ne 'ok') {
      throw "No se pudo verificar lectura en $Path."
    }
  } finally {
    if ([System.IO.File]::Exists($probe)) {
      [System.IO.File]::Delete($probe)
    }
  }
}

$initialStates = @()
foreach ($target in $targets) {
  if (Test-Path -LiteralPath $target.Path) {
    $initialStates += Get-PrivateAclState -Path $target.Path -AllowedSids $allowedSids
  }
}
$needsApply = @($initialStates | Where-Object { -not $_.secure }).Count -gt 0
$pm2Running = Test-Pm2AppRunning
if ($Mode -eq 'Apply' -and $needsApply -and $isLiveRoot -and $pm2Running) {
  throw 'PM2 esta activo. Ejecuta primero: pm2 stop yt-members-signal-trader. Despues aplica las ACL y vuelve a iniciar PM2.'
}

$results = @()
foreach ($target in $targets) {
  if (-not (Test-Path -LiteralPath $target.Path)) {
    $results += [pscustomobject]@{
      path = $target.Path
      exists = $false
      protected = $false
      secure = $true
      unexpectedAccessCount = 0
    }
    continue
  }

  if ($Mode -eq 'Apply') {
    $currentState = Get-PrivateAclState -Path $target.Path -AllowedSids $allowedSids
    if (-not $currentState.secure) {
      Set-PrivateAcl -Path $target.Path -Kind $target.Kind -AllowedSids $allowedSids
    }
  }
  $results += Get-PrivateAclState -Path $target.Path -AllowedSids $allowedSids
}

$insecure = @($results | Where-Object { $_.exists -and -not $_.secure })
[pscustomobject]@{
  ok = $insecure.Count -eq 0
  mode = $Mode.ToLowerInvariant()
  pm2Running = $pm2Running
  targets = $results
} | ConvertTo-Json -Depth 6

if ($insecure.Count -gt 0) {
  exit 1
}
