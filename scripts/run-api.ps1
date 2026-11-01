# Run ASP.NET Core API (dotnet run).
# Run from repository root:
#   .\scripts\run-api.ps1
#   .\scripts\run-api.cmd
param(
    [string]$ProjectName,
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Debug'
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

$apiProject = Join-Path $repoRoot "src\$ProjectName.Api\$ProjectName.Api.csproj"
if (-not (Test-Path -LiteralPath $apiProject)) {
    throw "Api project not found: $apiProject"
}

Write-Host "Api project: $apiProject"
Write-Host "Configuration: $Configuration"
dotnet run --project $apiProject -c $Configuration
exit $LASTEXITCODE
