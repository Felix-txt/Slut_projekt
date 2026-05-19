@echo off
setlocal

set "GIT_PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd"
set "GOURCE=C:\Program Files\Gource\cmd\gource.cmd"

if not exist "%GOURCE%" (
  echo Gource kunde inte hittas: %GOURCE%
  pause
  exit /b 1
)

if not exist "%GIT_PATH%\git.exe" (
  echo Git kunde inte hittas: %GIT_PATH%\git.exe
  echo Installera Git for Windows eller uppdatera GIT_PATH i den har filen.
  pause
  exit /b 1
)

set "PATH=%GIT_PATH%;%PATH%"

cd /d "%~dp0"
"%GOURCE%" --seconds-per-day 1 --auto-skip-seconds 1 --highlight-users --key --stop-at-end .

pause
