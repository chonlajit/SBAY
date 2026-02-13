# SBAY - ระบบถังขยะรีไซเคิลอัจฉริยะ ♻️

SBAY คือระบบรีไซเคิลอัจฉริยะที่ขับเคลื่อนด้วย IoT และ AI สำหรับตรวจจับวัตถุ ระบบสามารถจดจำขยะรีไซเคิล (เช่น ขวดและกระป๋อง) โดยใช้กล้องเว็บแคมและให้รางวัลผู้ใช้เป็นเครดิต

## 🚀 เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend**: Next.js (TypeScript, Tailwind CSS)
- **Backend**: Java Spring Boot
- **Database**: MongoDB
- **AI / IoT**: Python (YOLOv8 Object Detection)
- **Infrastructure**: Docker & Docker Compose

## 📂 โครงสร้างโปรเจค (Project Structure)

```bash
SBAY/
├── backend/          # Spring Boot API & Logic (ระบบหลังบ้าน)
├── frontend/         # Next.js Dashboard & User Interface (หน้าเว็บ)
├── iot-device/       # Python scripts for webcam & AI detection (สคริปต์กล้องและ AI)
├── docker-compose.yml # Container orchestration (จัดการ Docker)
└── start_fast.ps1    # Quick start script for Windows (สคริปต์รันโปรแกรม)
```

## 🛠️ สิ่งที่ต้องติดตั้ง (Prerequisites)

ตรวจสอบให้แน่ใจว่าคุณได้ติดตั้งโปรแกรมเหล่านี้แล้ว:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (แนะนำเวอร์ชัน LTS)
- [Java JDK 17+](https://adoptium.net/)
- [Python 3.9+](https://www.python.org/)

## ⚡ เริ่มต้นใช้งานด่วน (Quick Start - Windows)

วิธีที่ง่ายที่สุดในการรันระบบทั้งหมดคือใช้สคริปต์ PowerShell ที่เตรียมไว้ให้:

```powershell
./start_fast.ps1
```

สคริปต์นี้จะทำงานอัตโนมัติ:
1. เริ่ม **Backend** และ **MongoDB** ผ่าน Docker
2. เปิด **Frontend** (Next.js) development server
3. เริ่ม **Python Webcam Detector** เพื่อตรวจจับวัตถุ

### ช่องทางการเข้าถึง (Access Points)
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Admin QR Code**: [http://localhost:3000/admin/qr](http://localhost:3000/admin/qr)
- **Backend API**: [http://localhost:8080](http://localhost:8080) (พอร์ตเริ่มต้นของ Spring Boot)

## 🔧 การติดตั้งด้วยตนเอง (Manual Setup)

หากต้องการรันทีละส่วน:

### 1. Backend & Database
```bash
docker-compose up -d backend mongodb
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. IoT Device (AI Detection)
```bash
# แนะนำให้ใช้ virtual environment
cd iot-device
pip install -r requirements.txt
python webcam_detector.py
```

## 👥 ผู้จัดทำ

- **ทีมสบาย (SBAY Team)**

