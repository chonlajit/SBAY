# Start Docker Containers (Fast Mode)
# We use 'docker-compose up' but ONLY for backend and mongodb to avoid port 3000 conflict
# We use 'docker-compose up' but ONLY for backend and mongodb to avoid port 3000 conflict AND avoid starting the simulator
Write-Host "Starting Docker Containers (Backend & DB)..." -ForegroundColor Green
docker-compose up -d backend mongodb

# Wait for Backend
Write-Host "Waiting for Backend..." -ForegroundColor Yellow
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
