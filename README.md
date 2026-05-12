# ♻️ SBAY - Smart Bin Asset Management System

ระบบจัดการถังขยะอัจฉริยะแบบครบวงจร (Next.js + Spring Boot + MongoDB + Nginx)

---

## 🚀 ขั้นตอนการติดตั้งและเริ่มใช้งาน (Quick Start)

### 1. การเตรียมเครื่อง (Prerequisites)
ก่อนเริ่มติดตั้ง ตรวจสอบให้แน่ใจว่าเครื่องของคุณมี:
- **Windows 10/11** พร้อมติดตั้ง **WSL2 (Ubuntu)**
- **Docker Desktop** (ตั้งค่าให้ใช้ WSL2 Backend) หรือติดตั้ง Docker ภายใน Ubuntu 直接

### 2. การ Clone โปรเจกต์ (Cloning)
เปิด Terminal (PowerShell หรือ Ubuntu) แล้วรันคำสั่ง:
```bash
git clone <URL_ของ_REPO_คุณ>
cd SBAY
```

### 3. การเริ่มใช้งานระบบ (Running the App)
ใช้คำสั่ง Docker Compose เพื่อสร้างและเริ่มทำงานทุกส่วน (Frontend, Backend, Database, Proxy):
```powershell
# รันผ่าน WSL Ubuntu
wsl -d Ubuntu docker compose up -d --build
```
*หมายเหตุ: การรันครั้งแรกอาจใช้เวลา 3-5 นาที เนื่องจากการ Build Frontend (Next.js) และ Backend (Java)*

---

## 🌐 ช่องทางการเข้าใช้งาน (Access URLs)

เมื่อระบบสถานะขึ้นว่า **Running** ทั้งหมดแล้ว คุณสามารถเข้าใช้งานได้ดังนี้:

| ส่วนงาน | URL | หมายเหตุ |
| :--- | :--- | :--- |
| **หน้าเว็บหลัก (User)** | [http://localhost:8080](http://localhost:8080) | สำหรับผู้ใช้ทั่วไป / ลงทะเบียน |
| **หน้าจัดการ (Admin)** | [http://localhost:8080/admin](http://localhost:8080/admin) | ต้องใช้สิทธิ์ ADMIN เท่านั้น |
| **จัดการฐานข้อมูล GUI** | [http://localhost:8081](http://localhost:8081) | User: `admin` / Pass: `pass` |

---

## 🛠️ โครงสร้างระบบ (Architecture)

ระบบถูกออกแบบด้วยสถาปัตยกรรม Microservices ย่อยๆ ทำงานร่วมกันผ่าน Nginx Reverse Proxy:
- **Frontend**: Next.js 15 (รันที่พอร์ต 3000 ภายใน)
- **Backend**: Spring Boot (รันที่พอร์ต 8070 ภายใน)
- **Database**: MongoDB (เก็บข้อมูลถาวรใน Docker Volume)
- **Proxy**: Nginx (รับงานที่พอร์ต 8080 และกระจายงานไปส่วนต่างๆ)

---

## 🔑 คู่มือสำหรับ Admin

### วิธีการตั้งค่าสิทธิ์ ADMIN (Promote User)
หากคุณต้องการตั้งสิทธิ์ให้เบอร์โทรศัพท์ใดเป็น Admin ให้ใช้สคริปต์ที่เตรียมไว้:
```powershell
# รันผ่าน Bash ใน WSL
wsl -d Ubuntu bash promote.sh
```
*(ในสคริปต์มีการตั้งค่าเบอร์พื้นฐานไว้แล้ว คุณสามารถแก้ไขเบอร์ในไฟล์ `promote.sh` ได้)*

---

## 🐧 การติดตั้งบน Server จริง (Ubuntu Server)

หากต้องการนำไปรันบน Ubuntu Server ให้ทำตามขั้นตอนดังนี้:

1. **ติดตั้ง Docker**:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   sudo usermod -aG docker $USER
   ```
2. **Clone & Run**:
   ```bash
   git clone <REPO_URL>
   cd SBAY
   docker compose up -d --build
   ```
3. **การเปลี่ยนพอร์ต**: หากต้องการใช้พอร์ต 80 (พอร์ตมาตรฐานเว็บ) ให้แก้ไขไฟล์ `docker-compose.yml` ในส่วน `nginx` จาก `"8080:80"` เป็น `"80:80"`

---

## 📝 หมายเหตุการพัฒนา
- หากมีการแก้ไขโค้ดในโฟลเดอร์ `frontend` หรือ `backend` ต้องรันคำสั่ง `docker compose up -d --build` ใหม่เสมอเพื่อให้ Docker อัปเดตโค้ดล่าสุด
- ข้อมูลในฐานข้อมูลจะไม่หายไปแม้จะปิดเครื่อง เนื่องจากมีการใช้ `volumes: mongodb_data`

---
**พัฒนาโดย:** ทีม SBAY
