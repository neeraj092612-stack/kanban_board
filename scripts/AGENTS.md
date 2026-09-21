# Server Scripts

## Overview
Control scripts to start and stop the Project Management MVP services across platforms using Docker Compose.

## Available Scripts
- Windows Command Prompt:
  - `scripts/start-server.bat`: Builds and starts `pm-db` and `pm-web` containers in the background.
  - `scripts/stop-server.bat`: Stops and removes all project containers.
- Windows PowerShell:
  - `scripts/start-server.ps1`: PowerShell wrapper to launch services.
  - `scripts/stop-server.ps1`: PowerShell wrapper to stop services.
- Linux / macOS:
  - `scripts/start-server.sh`: Bash script to build and launch services.
  - `scripts/stop-server.sh`: Bash script to stop services.

## Operational Standards
- No emojis in script outputs or logs.
- All services are bound to port 8000 for the web application and 54322 for the Supabase local database.