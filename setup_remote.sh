#!/bin/bash
# สคริปต์ตั้งค่า SSH และ Tailscale สำหรับ Ubuntu (WSL/Linux)

echo "=========================================="
echo "   SBAY - REMOTE ACCESS SETUP (SSH & Tailscale)"
echo "=========================================="

# 1. อัปเดตระบบและติดตั้ง SSH
echo "[1/4] กำลังอัปเดตระบบและติดตั้ง SSH Server..."
sudo apt update
sudo apt install openssh-server -y

# 2. ตั้งค่าให้ SSH ทำงาน
echo "[2/4] กำลังเปิดใช้งาน SSH Service..."
sudo systemctl enable ssh
sudo service ssh start

# 3. ติดตั้ง Tailscale
echo "[3/4] กำลังติดตั้ง Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh

# 4. เริ่มต้น Tailscale
echo "[4/4] กำลังเปิดใช้งาน Tailscale..."
echo "กรุณาคลิกลิงก์ที่ปรากฏขึ้นเพื่อ Login Tailscale นะครับ"
sudo tailscale up

echo "=========================================="
echo "   ตั้งค่าเสร็จสมบูรณ์!"
echo "=========================================="
