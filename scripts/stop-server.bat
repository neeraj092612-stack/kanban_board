@echo off
echo Stopping Project Management MVP services...
docker compose down --remove-orphans
if %ERRORLEVEL% equ 0 (
    echo Services stopped successfully.
) else (
    echo Failed to stop services.
    exit /b %ERRORLEVEL%
)

