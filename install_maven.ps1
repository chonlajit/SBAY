# Install-Maven.ps1 - สคริปต์ติดตั้ง Maven อัตโนมัติสำหรับ Windows
$ErrorActionPreference = 'Stop'

# กำหนดเวอร์ชันและที่อยู่
$mavenVersion = "3.9.6"
$downloadUrl = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
$zipFile = "$env:TEMP\maven.zip"
$installPath = "C:\Maven"

Write-Host "[1/4] กำลังดาวน์โหลด Maven $mavenVersion..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile

Write-Host "[2/4] กำลังแตกไฟล์ไปที่ $installPath..." -ForegroundColor Cyan
if (!(Test-Path $installPath)) {
    New-Item -ItemType Directory -Path $installPath | Out-Null
}
Expand-Archive -Path $zipFile -DestinationPath $installPath -Force

# หาพาทของ bin
$mavenBinPath = "$installPath\apache-maven-$mavenVersion\bin"

Write-Host "[3/4] กำลังตั้งค่าระบบ (PATH)..." -ForegroundColor Cyan
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$mavenBinPath*") {
    $newPath = "$currentPath;$mavenBinPath"
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "เพิ่ม $mavenBinPath ลงใน PATH เรียบร้อยแล้ว" -ForegroundColor Green
} else {
    Write-Host "พบ Maven ใน PATH อยู่แล้ว ข้ามขั้นตอนนี้" -ForegroundColor Yellow
}

Write-Host "[4/4] ล้างไฟล์ชั่วคราว..." -ForegroundColor Cyan
Remove-Item $zipFile -Force

Write-Host "`n✅ ติดตั้ง Maven สำเร็จ!" -ForegroundColor Green
Write-Host "กรุณา **ปิด PowerShell แล้วเปิดใหม่** เพื่อให้เริ่มใช้งานคำสั่ง mvn ได้ครับ" -ForegroundColor Yellow
