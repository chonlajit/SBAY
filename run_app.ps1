# Start Docker Containers
Write-Host "Starting Docker Containers..." -ForegroundColor Green
docker-compose up -d --build

# Wait for Backend to be ready (simple pause)
Write-Host "Waiting for Backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "All systems GO!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000"
Write-Host "Admin QR: http://localhost:3000/admin/qr"
