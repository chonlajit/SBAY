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
├── setup_app.py      # สคริปต์ติดตั้งครั้งแรก (First-time setup)
├── run_app.py        # สคริปต์รันโปรแกรมประจำวัน (Daily launcher)
├── setup_docker.sh   # สคริปต์ช่วยติดตั้ง Docker บน Ubuntu WSL (Optional)
└── run_app.ps1       # (Legacy) PowerShell launcher
```

## 🛠️ สิ่งที่ต้องติดตั้ง (Prerequisites)

เพื่อให้ระบบทำงานได้ครบทุกส่วน คุณต้องเตรียมสภาพแวดล้อมดังนี้:

1.  **[Python 3.9+](https://www.python.org/downloads/)**: ใช้รันสคริปต์ควบคุมและ AI
2.  **[Node.js](https://nodejs.org/)** (LTS): ใช้สำหรับ Frontend
3.  **Docker Engine**: เลือกติดตั้งได้ 2 แบบ
    *   **Option A (ง่ายสุด):** ติดตั้ง [Docker Desktop](https://www.docker.com/products/docker-desktop/) บน Windows
    *   **Option B (เบาเครื่อง/Advance):** ติดตั้ง Docker บน WSL2 (Ubuntu) *มีสคริปต์ช่วยติดตั้งให้ในโปรเจค*

## ⚡ เริ่มต้นใช้งาน (Quick Start)

### 1. ติดตั้งครั้งแรก (First-time Setup)
รันไฟล์นี้เพื่อติดตั้ง dependencies ของ Frontend/Backend และเตรียม Docker
```bash
python setup_app.py
```
> ระบบจะตรวจสอบว่ามี Docker หรือยัง ถ้ายังไม่มีบน WSL จะแนะนำขั้นตอนติดตั้งให้

### 2. รันโปรแกรม (Daily Run)
เมื่อต้องการใช้งาน ให้รันไฟล์นี้:
```bash
python run_app.py
```

สคริปต์นี้จะจัดการทุกอย่างให้อัตโนมัติ:
1.  **Auto-Start Docker**: ตรวจสอบและเปิด Docker ให้ (ทั้งแบบ Desktop หรือ WSL)
2.  **Start Services**: รัน Backend และ MongoDB ผ่าน Docker
3.  **Launcher**: เปิดหน้าต่าง Frontend และ Webcam Detector ขึ้นมาพร้อมใช้งาน

### ช่องทางการเข้าถึง (Access Points)
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Admin QR Code**: [http://localhost:3000/admin/qr](http://localhost:3000/admin/qr)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

## 🔧 Docker บน WSL2 (Optional)
หากต้องการใช้ Docker บน WSL2 เพื่อประหยัดทรัพยากรเครื่อง (ไม่ต้องเปิด Docker Desktop):
1.  ติดตั้ง Ubuntu ใน WSL (`wsl --install -d Ubuntu`)
2.  รันคำสั่งติดตั้ง Docker ภายใน Ubuntu:
    ```bash
    wsl -d Ubuntu -e bash setup_docker.sh
    ```
3.  หลังจากนั้น `run_app.py` จะเรียกใช้ Docker ใน WSL ให้อัตโนมัติ

## 👥 ผู้จัดทำ

- **ทีมสบาย (SBAY Team)**
