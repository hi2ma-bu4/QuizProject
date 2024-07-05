@echo off

cd "%~dp0"

echo ï¿óÒÇ≈é¿çs
call npm start

if not "%ERRORLEVEL%"=="0" (
    echo error code: %ERRORLEVEL%
    pause
    start cmd /c runServer.bat
)

exit /b 0
