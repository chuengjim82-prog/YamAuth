# Start Vue dev server (npm install + npm run dev).
# Run from repository root:
#   .\scripts\dev-web.ps1
#   .\scripts\dev-web.cmd
param(
    [string]$ProjectName,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

function Get-ProjectNameFromSln {
    param([string]$Root)
    $sln = Get-ChildItem -LiteralPath $Root -Filter '*.sln' -File | Select-Object -First 1
    if (-not $sln) { $sln = Get-ChildItem -LiteralPath (Join-Path $Root 'src') -Filter '*.sln' -File | Select-Object -First 1 }
    if (-not $sln) { throw "No .sln found under $Root" }
    return [IO.Path]::GetFileNameWithoutExtension($sln.Name)
}

if (-not $ProjectName) {
    $ProjectName = Get-ProjectNameFromSln $repoRoot
}

$webDir = Join-Path $repoRoot "web\$ProjectName.Web"
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
