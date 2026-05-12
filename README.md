# SBAY Recycling Project Deployment Guide

คู่มือนี้จัดทำขึ้นเพื่อเตรียมความพร้อมสำหรับการนำโปรเจกต์ SBAY (เว็บแอปพลิเคชัน ฐานข้อมูล และระบบ Backend) ไปติดตั้งหรือ Deploy ขึ้น Server จริงหรือใช้งานผ่าน Docker

## โครงสร้างระบบ (System Architecture)

ระบบประกอบไปด้วย 3 ส่วนหลัก:
1. **Frontend (Next.js)**: พอร์ต 3000
2. **Backend (Spring Boot)**: พอร์ต 8070
3. **Database (MongoDB)**: พอร์ต 27017

---

## 🚀 การ Deploy ด้วย Docker Compose (แนะนำ)

วิธีที่สะดวกและง่ายที่สุดสำหรับการ Deploy ระบบคือการใช้ **Docker Compose** ซึ่งได้มีการเตรียมไฟล์ `docker-compose.yml` ให้พร้อมแล้ว

### ข้อกำหนดเบื้องต้น (Prerequisites)
- สำหรับ **Linux Server**: จะต้องติดตั้ง [Docker](https://docs.docker.com/get-docker/) และ [Docker Compose](https://docs.docker.com/compose/install/)
- สำหรับ **Windows Server / Local PC**: แนะนำให้รันผ่าน WSL (Windows Subsystem for Linux) โดยมีวิธีติดตั้งดังนี้:
  1. เปิด PowerShell (Run as Administrator)
  2. รันคำสั่งติดตั้ง WSL และ Ubuntu:
     ```bash
     wsl --install -d Ubuntu
     ```
  3. หลังจากติดตั้งเสร็จ ให้ทำการ Restart เครื่อง 1 ครั้ง
  4. เปิด PowerShell ขึ้นมาใหม่ เข้าไปที่โฟลเดอร์โปรเจกต์ จากนั้นรันสคริปต์ติดตั้ง Docker ใน WSL ที่มีอยู่ในโปรเจกต์:
     ```bash
     wsl -d Ubuntu -e bash setup_docker.sh
     ```

### ขั้นตอนการรัน
1. เข้าไปที่โฟลเดอร์หลักของโปรเจกต์ (SBAY)
2. รันคำสั่งต่อไปนี้เพื่อสั่ง Build และ Start Services ทั้งหมด:

   **กรณีใช้งานบนเซิร์ฟเวอร์ Linux ทั่วไป หรือใช้ Windows ร่วมกับ Docker Desktop:**
   ```bash
   docker-compose up -d --build
   ```

   **กรณีใช้งานบน Windows ผ่านระบบ WSL (Ubuntu) ตามที่มีการตั้งค่าในโปรเจกต์:**
   ```bash
   wsl -d Ubuntu docker compose up -d --build
   ```
3. รอจนกว่าระบบจะ Build เสร็จและรันขึ้นมา สามารถเช็คสถานะการทำงานได้ด้วย:
   ```bash
   docker-compose ps
   ```
4. ทดสอบเข้าใช้งาน:
   - **Frontend**: http://localhost:3000 หรือ `http://<IP_ของ_Server>:3000`
   - **Backend API**: http://localhost:8070 หรือ `http://<IP_ของ_Server>:8070`
   - **Admin QR**: http://localhost:3000/admin/qr

### การจัดการคอนเทนเนอร์
- **ดู Log การทำงาน**:
  ```bash
  docker-compose logs -f
  ```
- **ปิดการทำงาน**:
  ```bash
  docker-compose down
  ```

---

## 🛠 ข้อมูลสำหรับการ Deploy แยกระบบ (Manual Deployment)

หากคุณไม่ต้องการใช้ Docker Compose และต้องการนำไปรันบน Server แบบ Manual สามารถทำตามขั้นตอนต่อไปนี้:

### 1. ฐานข้อมูล MongoDB
- ติดตั้ง MongoDB บนเครื่อง Server
- ให้แน่ใจว่า Service MongoDB ทำงานอยู่ที่พอร์ต `27017`
- ฐานข้อมูลจะถูกสร้างและใช้งานชื่อ `iotdb` โดยอัตโนมัติ

### 2. Backend (Spring Boot)
ระบบ Spring Boot สามารถ Build เป็นไฟล์ `.jar` นำไปรันได้ทุกที่ที่มี Java 17

- **วิธี Build**:
  ```bash
  cd backend
  mvn clean package -DskipTests
  ```
- **วิธี Run**:
  หลังจาก Build จะได้ไฟล์ `.jar` ในโฟลเดอร์ `target` ให้นำไฟล์ไปรันโดยสามารถส่งค่า Environment Variables กำหนดที่อยู่ของ MongoDB ได้:
  ```bash
  export MONGODB_HOST=localhost
  java -jar target/iot-backend-0.0.1-SNAPSHOT.jar
  ```
  *(ถ้าใช้ชื่อไฟล์ต่างไป ให้เปลี่ยนชื่อไฟล์ `.jar` ให้ตรงกัน)*

### 3. Frontend (Next.js)
ฝั่ง Frontend จำเป็นต้องใช้ Node.js 18+

- **วิธี Build**:
  ```bash
  cd frontend
  npm install
  npm run build
  ```
- **วิธี Run**:
  รันด้วยโหมด Production:
  ```bash
  npm start
  ```
- คุณสามารถรันด้วยเครื่องมืออย่าง `PM2` (สำหรับจัดการ Process บนเซิร์ฟเวอร์) ได้เช่นกัน:
  ```bash
  pm2 start npm --name "sbay-frontend" -- start
  ```

## 🌍 การตั้งค่าเพื่อเชื่อมต่อ Domain Name (Production Ready)

ระบบได้รับการออกแบบโครงสร้างแบบ **Reverse Proxy (Nginx)** ไว้ให้พร้อมแล้ว หากคุณต้องการใช้ชื่อ Domain จริงๆ ทำได้ง่ายมากครับ:

1. ซื้อและตั้งค่าจดโดเมน (เช่น `sbay.com`)
2. ไปตั้งค่า **DNS A Record** ของโดเมนคุณ ให้ชี้เลข **Public IP** มาที่เครื่อง Server นี้ (ระบุช่อง Host เป็น `@` หรือ `www`)
3. เสร็จแล้ว!
4. เมื่อมีคนเข้าเว็บ `http://sbay.com` 
   - ระบบ **Nginx** จะรับหน้าที่ชี้คนเข้าเว็บไปที่ Frontend ให้โดยอัตโนมัติ 
   - และถ้ามีการกดแอป ระบบจะชี้เส้นทาง API ไปที่ Backend ให้อัตโนมัติ (ผ่านพาธ `/api`)

> **หมายเหตุ:** 
> - ระบบนี้ไม่ต้องพึ่งพาพอร์ต `3000` หรือ `8070` ในการเข้าใช้งานอีกต่อไป (แต่ต้องแน่ใจว่าเครื่อง Server ของคุณเปิดอนุญาตพอร์ต 80 จากภายนอกแล้ว)
> - ข้อมูลฐานข้อมูลทั้งหมด จะถูกเก็บถาวรด้วย `volumes` ของ Docker ข้อมูลจะไม่หายเมื่อสั่งปิดเครื่อง

---

## 🐧 Deployment on Ubuntu Server (Production)

ขั้นตอนสำหรับการนำไปติดตั้งบน Server จริง (Ubuntu 22.04/24.04):

### 1. ติดตั้ง Docker & Docker Compose
รันคำสั่งเหล่านี้เพื่อติดตั้ง Docker บน Server:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
# จากนั้นให้ Logout และ Login ใหม่เพื่อให้สิทธิ์ Docker ทำงาน
```

### 2. Clone โปรเจกต์
```bash
git clone <URL_ของ_REPO_คุณ>
cd SBAY
```

### 3. รันระบบด้วย Docker Compose
```bash
# รันแบบ Background
docker compose up -d --build
```

### 4. การเข้าใช้งาน
- **Web App**: `http://<SERVER_IP>:8080` (หรือพอร์ตที่ตั้งไว้)
- **Database GUI**: `http://<SERVER_IP>:8081`

### 💡 ข้อแนะนำสำหรับการขึ้น Production จริง:
1. **เปลี่ยนพอร์ตกลับเป็น 80**: หากไม่มีโปรแกรมอื่นใน Server แย่งใช้พอร์ต 80 แนะนำให้แก้ `docker-compose.yml` กลับไปเป็น `- "80:80"` เพื่อให้ผู้ใช้เข้าผ่าน URL ปกติได้โดยไม่ต้องพิมพ์พอร์ต
2. **การตั้งค่า Domain**: ชี้ A Record ของโดเมนคุณมาที่ IP ของ Server จากนั้นระบบ Nginx จะจัดการที่เหลือให้เองครับ
3. **ความปลอดภัย**: หากใช้บน Server จริง ควรตั้งรหัสผ่านให้ Mongo Express ใน `docker-compose.yml` ด้วยครับ

