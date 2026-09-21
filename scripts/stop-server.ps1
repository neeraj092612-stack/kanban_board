Write-Host "Stopping Project Management MVP services..."
docker compose down --remove-orphans
if ($LASTEXITCODE -eq 0) {
    Write-Host "Services stopped successfully."
} else {
    Write-Error "Failed to stop services."
    exit $LASTEXITCODE
}

