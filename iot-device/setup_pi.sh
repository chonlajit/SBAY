#!/bin/bash
# ==========================================
# SBAY Smart Bin - Raspberry Pi Setup Script
# รันสคริปต์นี้บน Raspberry Pi เพื่อติดตั้งทุกอย่าง
# ==========================================
set -e

echo "🚀 เริ่มต้นการติดตั้งสภาพแวดล้อม SBAY IoT Device..."

# 1. อัปเดตระบบ
echo "📦 1. กำลังอัปเดตระบบปฏิบัติการ..."
sudo apt update && sudo apt upgrade -y

# 2. ติดตั้งไลบรารีพื้นฐานสำหรับ OpenCV
echo "📷 2. กำลังติดตั้งไลบรารีสำหรับกล้อง (OpenCV Dependencies)..."
sudo apt install -y libgl1-mesa-glx libgtk2.0-dev pkg-config python3-opencv python3-tk python3-pil.imagetk python3-picamera2

# 3. ติดตั้ง Python และ Pip
echo "🐍 3. กำลังติดตั้ง Python 3 และเครื่องมือที่จำเป็น..."
sudo apt install -y python3-pip python3-venv

# 4. ติดตั้ง Python Packages (ลงในระบบ)
echo "📚 4. กำลังติดตั้งไลบรารี Python (YOLOv8, Requests, Dotenv)..."
# ใช้ --break-system-packages สำหรับ Raspberry Pi OS รุ่นใหม่ที่บังคับใช้ venv
pip3 install -r requirements.txt --break-system-packages || pip3 install -r requirements.txt

# 5. ติดตั้ง Auto-Start Service (ทำงานตอนเปิดเครื่อง)
echo "⚙️ 5. กำลังตั้งค่าให้โปรแกรมทำงานอัตโนมัติตอนเปิดเครื่อง..."
SERVICE_FILE="/etc/systemd/system/smartbin.service"
if [ -f "bin-device/smartbin.service" ]; then
    sudo cp bin-device/smartbin.service $SERVICE_FILE
    sudo systemctl daemon-reload
    sudo systemctl enable smartbin.service
    echo "✅ ติดตั้ง Service เรียบร้อยแล้ว (โปรแกรมจะรันเองเมื่อเปิดเครื่อง)"
else
    echo "⚠️ ไม่พบไฟล์ bin-device/smartbin.service ข้ามการตั้งค่า Auto-Start"
fi

echo "=========================================="
echo "🎉 ติดตั้งเสร็จสมบูรณ์!"
echo "=========================================="
echo "วิธีใช้งาน:"
echo "1. เข้าไปแก้ไขไฟล์ .env ในโฟลเดอร์ bin-device เพื่อใส่รหัสผ่าน"
echo "2. รีสตาร์ทเครื่อง (sudo reboot) เพื่อให้โปรแกรมทำงานอัตโนมัติ"
echo "3. หรือทดสอบรันด้วยตัวเอง: cd bin-device && python3 main_controller.py"
