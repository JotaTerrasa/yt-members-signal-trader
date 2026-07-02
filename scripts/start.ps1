$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (!(Test-Path "node_modules")) {
  npm install
}

npm run package:check
npm run start
