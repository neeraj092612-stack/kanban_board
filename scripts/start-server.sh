#!/usr/bin/env bash
set -e
echo "Starting Project Management MVP services..."
docker compose up -d --build --remove-orphans
echo "Services started successfully at http://localhost:8000"

