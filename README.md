# SBAY - ระบบถังขยะรีไซเคิลอัจฉริยะ ♻️

SBAY คือระบบรีไซเคิลอัจฉริยะที่ขับเคลื่อนด้วย IoT และ AI สำหรับตรวจจับวัตถุ ระบบสามารถจดจำขยะรีไซเคิล (เช่น ขวดและกระป๋อง) โดยใช้กล้องเว็บแคมและให้รางวัลผู้ใช้เป็นเครดิต

## 🚀 เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend**: Next.js (TypeScript, Tailwind CSS)
- **Backend**: Java Spring Boot
- **Database**: MongoDB
- **AI / IoT**: Python (YOLOv8 Object Detection)
- **Infrastructure**: Docker on WSL2

## 📂 โครงสร้างโปรเจค (Project Structure)

```bash
SBAY/
├── backend/          # Spring Boot API & Logic (ระบบหลังบ้าน)
├── frontend/         # Next.js Dashboard & User Interface (หน้าเว็บ)
├── iot-device/       # Python scripts for webcam & AI detection (สคริปต์กล้องและ AI)
├── docker-compose.yml # Container orchestration (จัดการ Docker)
├── setup_app.py      # สคริปต์ตรวจสอบและ setup environment
├── run_app.py        # สคริปต์รันโปรแกรม (Launcher)
├── setup_docker.sh   # สคริปต์ติดตั้ง Docker ใน Ubuntu (ใช้คู่กับ setup_app.py)
└── run_app.ps1       # (Legacy) PowerShell launcher
```

## 🛠️ คู่มือการติดตั้งสำหรับเครื่องใหม่ (Full Installation Guide)

หากคุณนำโปรเจคนี้ไปรันบนคอมพิวเตอร์เครื่องใหม่ ให้ทำตามขั้นตอนละเอียดดังนี้:

### ส่วนที่ 1: เตรียมโปรแกรมพื้นฐาน (One-time Setup)
ต้องติดตั้งโปรแกรมเหล่านี้ก่อน (ทำแค่ครั้งแรกครั้งเดียว):

1.  **ติดตั้ง Python**
    *   ดาวน์โหลด [Python 3.9+](https://www.python.org/downloads/)
    *   **สำคัญ:** ตอนติดตั้ง ต้องติ๊กถูกช่อง **"Add Python to PATH"** ด้านล่างสุดก่อนกด Install

2.  **ติดตั้ง Node.js**
    *   ดาวน์โหลด [Node.js (LTS Version)](https://nodejs.org/)
    *   ติดตั้งตามปกติ (Next ไปเรื่อยๆ)

3.  **ติดตั้ง WSL (Windows Subsystem for Linux)**
    *   กดปุ่ม Start พิมพ์ค้นหา **"PowerShell"** -> คลิกขวาเลือก **Run as Administrator**
    *   พิมพ์คำสั่งนี้แล้วกด Enter:
        ```powershell
        wsl --install -d Ubuntu
        ```
    *   รอจนเสร็จ **หากเครื่องแจ้งเตือนให้ Restart ให้กด Restart 1 ครั้ง** (เพื่อเปิดใช้งานฟีเจอร์ WSL)
    *   หลังจากเปิดเครื่องมาใหม่ หน้าต่าง Ubuntu จะเด้งขึ้นมาให้ตั้งชื่อ Username และ Password
        *   *ตั้งชื่ออะไรก็ได้ (เช่น admin)*
        *   *Password ตอนพิมพ์จะไม่เห็นตัวอักษร ให้พิมพ์แล้วกด Enter*

---

### ส่วนที่ 2: ตั้งค่า Docker และโปรเจค (Project Setup)
1.  **เปิด Terminal** ในโฟลเดอร์โปรเจค SBAY
2.  รันคำสั่งเพื่อเริ่มตั้งค่า:
    ```bash
    python setup_app.py
    ```
3.  **ทำตามคำแนะนำบนหน้าจอ:**
    *   สคริปต์จะเช็คว่าใน Ubuntu มี Docker หรือยัง
    *   ถ้ายังไม่มี: มันจะบอกให้รันคำสั่งติดตั้ง (ซึ่งคือ `wsl -d Ubuntu -e bash setup_docker.sh`)
    *   *เทคนิค: ตอนมันให้ใส่รหัสผ่าน Ubuntu ให้พิมพ์รหัสเดียวกับที่คุณตั้งในขั้นตอนที่ 1*
4.  เมื่อติดตั้ง Docker เสร็จ ให้รัน `python setup_app.py` ซ้ำอีกรอบเพื่อลงโปรแกรมส่วนที่เหลือจนครบ

---

### ส่วนที่ 3: เริ่มใช้งาน (Daily Usage)
เมื่อติดตั้งทุกอย่างครบแล้ว ทุกครั้งที่จะเปิดระบบ ให้ทำแค่นี้:

1.  เปิด Terminal ในโฟลเดอร์โปรเจค
2.  พิมพ์คำสั่ง:
    ```bash
    python run_app.py
    ```
3.  ระบบจะทำงานอัตโนมัติ:
    *   ✅ เปิด Docker ใน Ubuntu ให้เอง
    *   ✅ รัน Backend & Database
    *   ✅ เปิดหน้าเว็บและกล้องตรวจจับขยะ


- **ทีมสบาย (SBAY Team)**
