@echo off
echo Starting Project Management MVP services...
docker compose up -d --build --remove-orphans
if %ERRORLEVEL% equ 0 (
    echo Services started successfully at http://localhost:8000
) else (
    echo Failed to start services.
    exit /b %ERRORLEVEL%
)

