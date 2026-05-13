#!/bin/bash
# สคริปต์ติดตั้ง Docker และ Docker Compose ใน Ubuntu (WSL)

echo "=========================================="
echo "   SBAY - DOCKER INSTALLER FOR WSL"
echo "=========================================="

# 1. ล้างของเก่าที่อาจจะค้างอยู่
sudo apt-get remove docker docker-engine docker.io containerd runc -y

# 2. อัปเดตและลงตัวช่วย
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 3. เพิ่ม Docker Key และ Repository
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. ติดตั้ง Docker ชุดใหญ่
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 5. ตั้งค่าให้รันได้ไม่ต้องใช้ sudo
sudo usermod -aG docker $USER

# 6. ติดตั้ง docker-compose ตัวเก่า (เผื่อเรียกใช้แบบไม่มีขีด)
sudo apt-get install -y docker-compose

echo "=========================================="
echo "   ติดตั้ง Docker สำเร็จ!"
echo "   กรุณารันคำสั่ง: sudo service docker start"
echo "=========================================="
