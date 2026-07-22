# SBAY Smart Bin - IoT Device

โฟลเดอร์นี้รวบรวมโค้ดและสคริปต์ทั้งหมดที่ใช้ทำงานบนเครื่อง **Raspberry Pi**

## วิธีติดตั้งและใช้งานบน Raspberry Pi

เมื่อคุณนำโฟลเดอร์โปรเจกต์นี้ทั้งหมดไปใส่ไว้บนตู้ Raspberry Pi แล้ว ให้ทำตามขั้นตอนต่อไปนี้:

### 1. ตั้งค่ารหัสผ่านในไฟล์ `.env`
ก็อปปี้หรือสร้างไฟล์ `.env` ไว้ในโฟลเดอร์ `bin-device` (เช่น `iot-device/bin-device/.env`)
และตั้งค่าข้อมูลที่จำเป็น เช่น:
```ini
DEVICE_ID=BIN-001
BACKEND_URL=https://<your-cloudflare-tunnel-url>
DEVICE_SECRET=<your-device-secret>

# --- การตั้งค่าเปิด-ปิดฮาร์ดแวร์ (Hardware Toggles) ---
USE_CAMERA=true   # เปิดใช้กล้อง Picamera2 (false = ใช้ Webcam)
USE_SERVO=true    # เปิดใช้เซอร์โวมอเตอร์ (false = จำลองการทำงาน)
USE_IR=true       # เปิดใช้เซ็นเซอร์อินฟาเรด (false = กล้องรันตลอด)

# --- ทั่วไป ---
USE_GUI=true
```

### 2. รันสคริปต์ติดตั้งสภาพแวดล้อมอัตโนมัติ (Automated Setup)
เปิด Terminal **บนเครื่อง Raspberry Pi** (อย่ารันบน Windows) จากนั้นเข้าไปที่โฟลเดอร์ `iot-device` และรันคำสั่ง:

```bash
chmod +x setup_pi.sh
./setup_pi.sh
```

สคริปต์นี้จะจัดการ:
- อัปเดต OS
- ติดตั้งไลบรารีที่จำเป็นสำหรับกล้อง (OpenCV)
- ติดตั้ง Python3 และ Pip
- โหลดไลบรารีทั้งหมดใน `requirements.txt`
- ตั้งค่าให้โปรแกรมเปิดทำงานอัตโนมัติตอนเปิดเครื่อง (`smartbin.service`)

### 3. รีสตาร์ทเครื่อง (Reboot)
เพื่อให้ระบบ Auto-Start เริ่มทำงานสมบูรณ์ ให้รีสตาร์ทเครื่อง 1 ครั้ง:
```bash
sudo reboot
```

### การควบคุมโปรแกรม (Manual Control)
หากคุณต้องการสั่งเปิด-ปิด โปรแกรมด้วยตัวเอง สามารถใช้คำสั่ง:

- **หยุดโปรแกรม**: `sudo systemctl stop smartbin.service`
- **เริ่มโปรแกรม**: `sudo systemctl start smartbin.service`
- **ดู Log การทำงาน**: `journalctl -u smartbin.service -f`
- **รันด้วยตัวเองแบบเห็น Log ทันที**: `cd bin-device && python3 main_controller.py`

### การต่อวงจรสวิตช์รีเซ็ตปริมาณขยะ (Reset Switches)
สวิตช์รีเซ็ตถูกตั้งค่าให้ต้อง **กดค้าง 2 วินาที** เพื่อป้องกันการเผลอไปโดน โดยต่อแบบ Active Low (ดึงสายหนึ่งเข้า GPIO อีกสายเข้า Ground) ดังนี้:

| ปุ่มกด (Switch) | ขา GPIO (BCM) | การทำงาน |
|------------------|---------------|----------|
| **Pin 22** | GPIO 22 | ล้างปริมาณ "ขวดพลาสติก" |
| **Pin 23** | GPIO 23 | ล้างปริมาณ "กระป๋อง" |
| **Pin 24** | GPIO 24 | ล้างปริมาณ "กล่องเครื่องดื่ม" |
| **Pin 25** | GPIO 25 | ล้างปริมาณ "ทุกประเภท" พร้อมกัน (Reset All) |

*(ตั้งค่าเปิด-ปิด การใช้งานสวิตช์ได้ในไฟล์ `.env` ด้วยคำสั่ง `USE_RESET_BUTTONS=true`)*

---
*หมายเหตุ: สคริปต์ `setup_pi.sh` ไม่สามารถรันบน Windows ได้ตามที่คุณอาจจะพบเห็นใน PowerShell มันถูกออกแบบมาเพื่อระบบปฏิบัติการ Linux บน Raspberry Pi โดยเฉพาะ*
