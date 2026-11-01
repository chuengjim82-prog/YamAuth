#!/usr/bin/env bash
# 从 YamAuth 脚手架生成新项目。
# Windows：优先用 scripts\new-project.ps1 或 scripts\new-project.cmd
# Linux/macOS/Git Bash：本脚本；需 pwsh，或 Windows 上回退到 powershell.exe
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if command -v pwsh >/dev/null 2>&1; then
  exec pwsh -NoProfile -File "$ROOT/scripts/new-project.ps1" "$@"
fi
if command -v powershell.exe >/dev/null 2>&1; then
  exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ROOT/scripts/new-project.ps1" "$@"
fi
echo "PowerShell is required. Windows: run .\\scripts\\new-project.ps1" >&2
echo "Or install PowerShell 7: https://learn.microsoft.com/powershell/scripting/install/installing-powershell" >&2
exit 1
