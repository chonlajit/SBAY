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
- Server จะต้องติดตั้ง [Docker](https://docs.docker.com/get-docker/) และ [Docker Compose](https://docs.docker.com/compose/install/)

### ขั้นตอนการรัน
1. เข้าไปที่โฟลเดอร์หลักของโปรเจกต์ (SBAY)
2. รันคำสั่งต่อไปนี้เพื่อสั่ง Build และ Start Services ทั้งหมด:
   ```bash
   docker-compose up -d --build
   ```
   *(หรือใช้ `docker compose up -d --build` หากใช้ Docker รุ่นใหม่)*
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

---

## หมายเหตุ / ข้อควรระวังในการ Deploy

1. **Environment Variables**:
   ใน `docker-compose.yml` ได้จัดการการเชื่อมต่อกันระหว่าง Frontend และ Backend ไว้แล้ว แต่หากนำไป Deploy ใน Server จริงที่แยก Domain (เช่น `api.sbay.com` และ `www.sbay.com`) คุณต้องกำหนด `NEXT_PUBLIC_API_URL` ในฝั่ง Frontend ใหม่ให้ชี้ไปยัง Domain ของ Backend (ตั้งค่าในตอน Build หรือส่งเป็น Environment Variable เข้าไป)
2. **CORS Configuration**:
   หาก Frontend มีการเรียก API ไปยัง Backend ข้าม Domain, ตรวจสอบการตั้งค่า CORS (Cross-Origin Resource Sharing) ในโปรเจกต์ Backend ให้รองรับ Domain ของ Frontend ด้วย. (ปัจจุบันอนุญาตสำหรับ `http://localhost:3000` และทั้งหมดตามที่ตั้งค่าใน `WebConfig.java`)
3. **Data Persistence**:
   ใน `docker-compose.yml` ได้ตั้งค่า `volumes: mongodb_data:/data/db` ไว้แล้ว ทำให้ข้อมูลจะไม่หายเมื่อสั่งลบ Container ข้อมูลของ MongoDB จะถูกจัดเก็บไว้ใน Host Machine
