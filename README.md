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

เพื่อให้ระบบทำงานได้ครบทุกส่วน คุณต้องติดตั้งโปรแกรมต่อไปนี้:

1.  **[Git](https://git-scm.com/downloads)**: สำหรับดาวน์โหลด (Clone) โปรเจค
2.  **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: สำหรับรัน Backend และ Database (ไม่ต้องลง Java/Maven เองเพราะ Docker จัดการให้)
3.  **[Node.js](https://nodejs.org/)** (แนะนำเวอร์ชัน LTS): สำหรับรัน Frontend (หน้าเว็บ)
4.  **[Python 3.9+](https://www.python.org/downloads/)**: สำหรับรันระบบ AI ตรวจจับขยะผ่านกล้อง

> **หมายเหตุ**: หากคุณจะรัน Backend แบบ Manual (ไม่ผ่าน Docker) จำเป็นต้องติดตั้ง **Java JDK 17+** ด้วย

## ⚡ เริ่มต้นใช้งานด่วน (Quick Start - Windows)

วิธีที่ง่ายที่สุดในการรันระบบทั้งหมดคือใช้สคริปต์ PowerShell ที่เตรียมไว้ให้:

### 1. Clone โปรเจค
```bash
git clone https://github.com/chonlajit/SBAY-demo.git
cd SBAY-demo
```

### 2. รันโปรแกรม
```powershell
./run_app.ps1
```

สคริปต์นี้จะจัดการติดตั้ง dependencies (ถ้ายังไม่มี) และเริ่มทำงานอัตโนมัติ:
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

