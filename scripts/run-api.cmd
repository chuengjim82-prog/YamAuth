@echo off

setlocal

set "ROOT=%~dp0.."

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\run-api.ps1" %*

