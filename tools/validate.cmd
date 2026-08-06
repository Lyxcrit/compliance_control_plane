@echo off
setlocal

rem Run the repository validator in the WSL terminal, not via a Windows file association.
wsl.exe bash -lc "cd /home/lyx/projects/compliance_control_plane && ./tools/validate.sh"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" pause
exit /b %EXIT_CODE%
