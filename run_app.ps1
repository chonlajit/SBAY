# Check and Install Frontend Dependencies
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "Frontend dependencies not found. Installing..." -ForegroundColor Yellow
    Push-Location frontend
    npm install --legacy-peer-deps
    Pop-Location
}
else {
    Write-Host "Frontend dependencies found. Skipping install." -ForegroundColor Green
}

# Check and Install IoT Device Dependencies
# We assume python is installed and in path.
Write-Host "Checking IoT Device dependencies..." -ForegroundColor Yellow
Push-Location iot-device
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
}
Pop-Location

# Start Docker Containers (Backend & MongoDB)
Write-Host "Starting Docker Containers (Backend & DB)..." -ForegroundColor Green
docker-compose up -d backend mongodb

# Wait for Backend to be ready
Write-Host "Waiting for Backend to initialize (5s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Frontend (npm run dev)
Write-Host "Starting Frontend (npm run dev)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; $env:NODE_OPTIONS='--max-old-space-size=4096'; npm run dev"

# Start Python Webcam Script
Write-Host "Starting Webcam Detector..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python iot-device/webcam_detector.py"

Write-Host "All systems GO!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000"
Write-Host "Admin QR: http://localhost:3000/admin/qr"
