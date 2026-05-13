#!/bin/bash
# SBAY - DOCKER INSTALLER FOR WSL (Linux Format)

# ป้องกันปัญหาเรื่องตัวจบบรรทัด
set -e

echo "=========================================="
echo "   SBAY - DOCKER INSTALLER FOR WSL"
echo "=========================================="

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg || true

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose

# สร้างกลุ่ม docker และดึง User เข้าไป
sudo groupadd docker || true
sudo usermod -aG docker $USER

echo "=========================================="
echo "   ติดตั้ง Docker สำเร็จ!"
echo "   กรุณารัน: sudo service docker start"
echo "=========================================="
