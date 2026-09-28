@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLISH.ps1" %*
set "code=%ERRORLEVEL%"
if not "%code%"=="0" echo 公開処理は失敗しました。ログを確認してください。
if "%code%"=="0" echo 公開処理は成功しました。Pages反映を確認してください。
echo.
pause
exit /b %code%
