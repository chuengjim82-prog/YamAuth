#!/usr/bin/env bash
# 在仓库根目录执行：导出 OpenAPI + 生成前端 TS 类型（Linux/macOS/CI）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_PROJ="$ROOT/src/YamAuth.Api/YamAuth.Api.csproj"
DLL="$ROOT/src/YamAuth.Api/bin/Release/net8.0/YamAuth.Api.dll"
OUT="$ROOT/openapi/openapi.json"

echo "Building YamAuth.Api (Release)..."
dotnet build "$API_PROJ" -c Release

echo "Restoring dotnet tools..."
pushd "$ROOT" >/dev/null
dotnet tool restore

mkdir -p "$(dirname "$OUT")"
export ASPNETCORE_ENVIRONMENT=IntegrationTests
export Jwt__SecretKey="IntegrationTest-SecretKey-32Bytes!!!"
export Db__Base="Server=127.0.0.1;Database=YamBase;TrustServerCertificate=True"
export Db__Bzss="Server=127.0.0.1;Database=YamBzss;TrustServerCertificate=True"

echo "Exporting OpenAPI -> $OUT"
pushd "$(dirname "$DLL")" >/dev/null
dotnet swagger tofile --output "$OUT" "$(basename "$DLL")" v1
popd >/dev/null
popd >/dev/null

echo "Generating TypeScript types..."
pushd "$ROOT/web/YamAuth.Web" >/dev/null
npm run openapi:types
popd >/dev/null

echo "Done."
