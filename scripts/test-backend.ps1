# Run backend tests (dotnet test).
# Run from repository root:
#   .\scripts\test-backend.ps1
#   .\scripts\test-backend.cmd
param(
    [string]$ProjectName,
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Release',
    [string]$Filter
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

$slnPath = Join-Path $repoRoot "$ProjectName.sln"
if (-not (Test-Path -LiteralPath $slnPath)) {
    throw "Solution not found: $slnPath"
}

Write-Host "Solution: $slnPath"
Write-Host "Configuration: $Configuration"
$testArgs = @('test', $slnPath, '-c', $Configuration)
if ($Filter) {
    $testArgs += @('--filter', $Filter)
}
dotnet @testArgs
exit $LASTEXITCODE
