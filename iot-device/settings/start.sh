#!/bin/bash
# ============================
# SBAY Smart Bin - Auto Start Script
# ใส่ใน crontab หรือ systemd เพื่อรันอัตโนมัติตอนเปิดเครื่อง Pi
# ============================

# ตั้งค่าต่างๆ ถูกย้ายไปที่ไฟล์ .env แทนแล้วเพื่อความปลอดภัย
# กรุณาแก้ไขการตั้งค่าในไฟล์ .env ในโฟลเดอร์เดียวกัน

# Path
APP_DIR="/home/pi/SBAY/iot-device/bin-device"
LOG_FILE="/home/pi/SBAY/logs/smartbin.log"

# สร้าง log directory
mkdir -p "$(dirname $LOG_FILE)"

# เข้า directory
cd "$APP_DIR"

# รันด้วย Python
echo "[$(date)] Starting SBAY Smart Bin..." >> "$LOG_FILE"
python3 main_controller.py >> "$LOG_FILE" 2>&1
