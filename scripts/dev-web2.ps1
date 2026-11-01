# Start the React + Ant Design dev server.
# Run from repository root:
#   .\scripts\dev-web2.ps1
param(
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $repoRoot 'web\YamAuth.Web2'
if (-not (Test-Path -LiteralPath $webDir)) {
    throw "Web project not found: $webDir"
}

Write-Host "Web project: $webDir"
Push-Location $webDir
try {
    if (-not $SkipInstall) {
        npm install
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    npm run dev
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
