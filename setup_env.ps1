$ErrorActionPreference = 'Stop'
Write-Host "========================================="
Write-Host "   SBAY SMART BIN - ENVIRONMENT SETUP"
Write-Host "========================================="

# 1. Check/Install Node.js
Write-Host "`n[1/4] ตรวจสอบ Node.js..." -ForegroundColor Cyan
if (!(Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "ไม่พบ Node.js กำลังติดตั้งผ่าน Winget..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS -e --accept-source-agreements --accept-package-agreements
} else {
    Write-Host "มี Node.js อยู่แล้ว" -ForegroundColor Green
}

# 2. Check/Install Java 17
Write-Host "`n[2/4] ตรวจสอบ Java 17..." -ForegroundColor Cyan
if (!(Get-Command "java" -ErrorAction SilentlyContinue)) {
    Write-Host "ไม่พบ Java กำลังติดตั้ง Temurin JDK 17..." -ForegroundColor Yellow
    winget install EclipseAdoptium.Temurin.17.JDK -e --accept-source-agreements --accept-package-agreements
} else {
    Write-Host "มี Java อยู่แล้ว" -ForegroundColor Green
}

# 3. Check/Install Maven
Write-Host "`n[3/4] ตรวจสอบ Maven..." -ForegroundColor Cyan
if (!(Get-Command "mvn" -ErrorAction SilentlyContinue)) {
    Write-Host "ไม่พบ Maven กำลังดาวน์โหลดและติดตั้ง..." -ForegroundColor Yellow
    $mavenVersion = "3.9.6"
    $downloadUrl = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
    $zipFile = "$env:TEMP\maven.zip"
    $installPath = "C:\Maven"

    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile
    if (-not (Test-Path $installPath)) { New-Item -ItemType Directory -Path $installPath | Out-Null }
    Expand-Archive -Path $zipFile -DestinationPath $installPath -Force

    $mavenBinPath = "$installPath\apache-maven-$mavenVersion\bin"
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($currentPath -notlike "*$mavenBinPath*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$mavenBinPath", "User")
    }
    Remove-Item $zipFile -Force
    Write-Host "ติดตั้ง Maven สำเร็จ (C:\Maven)" -ForegroundColor Green
} else {
    Write-Host "มี Maven อยู่แล้ว" -ForegroundColor Green
}

# 4. Frontend Dependencies
Write-Host "`n[4/4] ติดตั้ง Frontend Dependencies..." -ForegroundColor Cyan
if (Test-Path ".\frontend\package.json") {
    Set-Location ".\frontend"
    npm install
    Set-Location ".."
    Write-Host "ติดตั้ง Dependencies สำเร็จ" -ForegroundColor Green
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "✅ ติดตั้งสภาพแวดล้อมเสร็จสิ้น!" -ForegroundColor Green
Write-Host "กรุณา **ปิด PowerShell แล้วเปิดใหม่** ก่อนรัน start_app.py" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Green
