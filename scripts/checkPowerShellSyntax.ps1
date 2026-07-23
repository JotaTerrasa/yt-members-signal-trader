$ErrorActionPreference = 'Stop'

$files = @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1' -File | Sort-Object FullName)
$failures = @(
  foreach ($file in $files) {
    $tokens = $null
    $errors = $null
    [Management.Automation.Language.Parser]::ParseFile(
      $file.FullName,
      [ref]$tokens,
      [ref]$errors
    ) | Out-Null

    foreach ($parseError in @($errors)) {
      "$($file.Name):$($parseError.Extent.StartLineNumber):$($parseError.Extent.StartColumnNumber) $($parseError.Message)"
    }
  }
)

if ($failures.Count -gt 0) {
  throw "Errores de sintaxis PowerShell:`n$($failures -join "`n")"
}

Write-Output "Sintaxis PowerShell correcta en $($files.Count) scripts."
