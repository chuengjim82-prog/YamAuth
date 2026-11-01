# 在仓库根目录执行：导出 OpenAPI + 生成前端 TS 类型
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Building YamAuth.Api (Release)..."
dotnet build (Join-Path $root "src/YamAuth.Api/YamAuth.Api.csproj") -c Release

Write-Host "Restoring dotnet tools..."
Push-Location $root
dotnet tool restore

$dll = Join-Path $root "src/YamAuth.Api/bin/Release/net8.0/YamAuth.Api.dll"
$out = Join-Path $root "openapi/openapi.json"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null

$env:ASPNETCORE_ENVIRONMENT = "IntegrationTests"
$env:Jwt__SecretKey = "IntegrationTest-SecretKey-32Bytes!!!"
$env:Db__Base = "Server=127.0.0.1;Database=YamBase;TrustServerCertificate=True"
$env:Db__Bzss = "Server=127.0.0.1;Database=YamBzss;TrustServerCertificate=True"
Write-Host "Exporting OpenAPI -> $out"
Push-Location (Split-Path $dll)
dotnet swagger tofile --output $out (Split-Path $dll -Leaf) v1
Pop-Location

Pop-Location

Write-Host "Generating TypeScript types..."
Push-Location (Join-Path $root "web/YamAuth.Web")
npm run openapi:types
Pop-Location

Write-Host "Done."
