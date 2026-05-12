# IoT Backend for RPi (SBAY)

นี่คือ Backend สำหรับโปรเจกต์ SBAY พัฒนาด้วย **Spring Boot 3.2.0** และ **Java 17** โดยใช้ฐานข้อมูล **MongoDB**

## สิ่งที่ต้องเตรียม (Prerequisites)

ก่อนที่จะรันโปรเจกต์นี้ ตรวจสอบให้แน่ใจว่าเครื่องของคุณได้ติดตั้งเครื่องมือเหล่านี้แล้ว:
- **Java Development Kit (JDK) 17**
- **Apache Maven** (สำหรับ build และรันโปรเจกต์)
- **MongoDB** (รันอยู่ที่ `localhost:27017`)

## การตั้งค่าฐานข้อมูล (Database Setup)

โปรเจกต์จะเชื่อมต่อกับ MongoDB โดยอัตโนมัติตามการตั้งค่าใน `src/main/resources/application.properties`:
- **Host**: `localhost`
- **Port**: `27017`
- **Database**: `iotdb`

หากคุณติดตั้ง MongoDB ในเครื่องแล้ว ให้รัน Service ของ MongoDB ทิ้งไว้ หรือถ้าใช้ Docker สามารถรัน MongoDB ด้วยคำสั่ง:
```bash
docker run -d -p 27017:27017 --name sbay-mongodb mongo
```

## วิธีการรันโปรเจกต์

1. **เปิด Terminal / Command Prompt** แล้วเข้าไปที่โฟลเดอร์ `backend`:
   ```bash
   cd d:/SBAY/backend
   ```
   *(หรือ path ที่โปรเจกต์ตั้งอยู่)*

2. **คอมไพล์และดาวน์โหลด Dependency**:
   ```bash
   mvn clean install
   ```

3. **รันเซิร์ฟเวอร์ด้วย Spring Boot**:
   ```bash
   mvn spring-boot:run
   ```

   **หรือ** หลังจาก build เสร็จ สามารถรันผ่านไฟล์ `.jar` ได้ด้วย:
   ```bash
   java -jar target/iotbackend-0.0.1-SNAPSHOT.jar
   ```

4. เซิร์ฟเวอร์จะเริ่มต้นการทำงานที่ port `8080` (ตามที่ตั้งค่าไว้ใน `application.properties`)
   - API จะพร้อมใช้งานที่: `http://localhost:8080`

## โครงสร้างโปรเจกต์ (เบื้องต้น)
- โปรเจกต์นี้รวมการทำงานกับ IoT Devices ต่างๆ เช่น เซ็นเซอร์ หรือ RPi
- มีระบบ WebSocket สำหรับการรับส่งข้อมูลแบบ Real-time
- มีการใช้ JWT สำหรับ Authentication

## ปัญหาที่อาจพบ
- **Port 8080 ถูกใช้งานอยู่**: ให้เข้าไปเปลี่ยน `server.port` ใน `application.properties` หรือหาโปรแกรมที่ใช้ port 8080 แล้วปิดไปก่อน
- **เชื่อมต่อ MongoDB ไม่ได้**: ตรวจสอบว่ารัน MongoDB Service เรียบร้อยแล้ว และไม่ได้เปลี่ยน Port เริ่มต้น (27017)
