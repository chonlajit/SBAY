#!/bin/bash
# ============================
# SBAY Smart Bin - Auto Start Script
# ใส่ใน crontab หรือ systemd เพื่อรันอัตโนมัติตอนเปิดเครื่อง Pi
# ============================

# ตั้งค่า Environment
export DEVICE_ID="BIN-001"
export BACKEND_URL="http://192.168.1.100:8080"
export USE_HARDWARE="true"
export USE_GUI="true"
export MODEL_PATH="/home/pi/SBAY/iot-device/yolov8n.pt"

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
