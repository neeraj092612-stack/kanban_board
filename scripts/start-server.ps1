Write-Host "Starting Project Management MVP services..."
docker compose up -d --build --remove-orphans
if ($LASTEXITCODE -eq 0) {
    Write-Host "Services started successfully at http://localhost:8000"
} else {
    Write-Error "Failed to start services."
    exit $LASTEXITCODE
}

