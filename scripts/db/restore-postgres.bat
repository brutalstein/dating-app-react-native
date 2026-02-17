@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-postgres.ps1" %*
exit /b %errorlevel%
