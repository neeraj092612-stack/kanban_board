#!/usr/bin/env bash
set -e
echo "Stopping Project Management MVP services..."
docker compose down --remove-orphans
echo "Services stopped successfully."

