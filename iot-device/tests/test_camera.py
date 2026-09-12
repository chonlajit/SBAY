import time
import sys

def test_camera():
    print("====================================")
    print("  🛠️ เริ่มการทดสอบกล้อง (Picamera2) ")
    print("====================================")
    
    try:
        from picamera2 import Picamera2
    except ImportError:
        print("❌ ไม่พบไลบรารี picamera2 กรุณารัน sudo apt install python3-picamera2")
        sys.exit(1)

    try:
        # สร้าง Object แต่ยังไม่ start
        try:
            picam = Picamera2()
            cameras = picam.global_camera_info()
        except IndexError:
            cameras = []
            picam = None
        
        print(f"🔍 ระบบพบกล้องทั้งหมด: {len(cameras)} ตัว")
        
        if len(cameras) == 0 or picam is None:
            print("\n❌ [ERROR] ระบบไม่เจอกล้องเลยครับ (libcamera ไม่พบฮาร์ดแวร์กล้อง)!")
            print("  1. ตรวจสอบสายแพ (Ribbon Cable):")
            print("     - เสียบถูกพอร์ตหรือไม่? (ต้องเสียบพอร์ต CAMERA / CSI ไม่ใช่ DISPLAY / DSI)")
            print("     - เสียบกลับด้านหรือไม่? (บน Pi 3/4: หน้าสัมผัสสีเงินต้องหันไปทางพอร์ต HDMI, แถบสีฟ้าหันทางพอร์ต USB/LAN)")
            print("     - กิ๊บล็อก (Latch) แน่นสนิทดีหรือไม่")
            print("     - คอนเน็กเตอร์ตัวเล็ก (Sunny connector) บนตัวเซนเซอร์ของโมดูลกล้องหลุดหรือไม่")
            print("  2. ตรวจสอบการตั้งค่าใน config.txt (/boot/firmware/config.txt หรือ /boot/config.txt):")
            print("     - หากเป็นกล้อง V1 (OV5647) หรือกล้องโมดูลจีน อาจต้องเพิ่ม: dtoverlay=ov5647")
            print("     - หากเป็นกล้อง V2 ให้เพิ่ม: dtoverlay=imx219")
            print("     - หากเป็นกล้อง V3 ให้เพิ่ม: dtoverlay=imx708")
            print("  3. ตรวจสอบว่ามี process อื่นใช้งานกล้องอยู่หรือไม่:")
            print("     - ตรวจสอบ service: sudo systemctl status smartbin.service (ถ้ามีให้หยุดก่อน: sudo systemctl stop smartbin.service)")
            print("  4. ตรวจสอบด้วยคำสั่ง CLI:")
            print("     - rpicam-hello --list-cameras หรือ libcamera-hello --list-cameras")
            sys.exit(1)
            
        for i, cam in enumerate(cameras):
            print(f"  📷 กล้องที่ {i}: {cam}")
            
        print("\n⏳ กำลังพยายามเปิดกล้องและตั้งค่า...")
        config = picam.create_preview_configuration(main={"format": "BGR888", "size": (3280, 2464)})
        picam.configure(config)
        picam.start()
        print("✅ เปิดกล้องสำเร็จ (Hardware รันได้)")
        
        # วอร์มอัพกล้อง
        time.sleep(2)
        
        print("📸 กำลังทดสอบดึงภาพ 1 เฟรม...")
        img = picam.capture_array()
        print(f"✅ ดึงภาพสำเร็จ! ขนาดของภาพ (Resolution): {img.shape}")
        
        picam.stop()
        print("\n🎉 สรุป: กล้องทำงานได้ปกติ 100% ครับ")
        
    except Exception as e:
        import traceback
        print(f"\n❌ [ERROR] เกิดข้อผิดพลาดระหว่างรัน:")
        traceback.print_exc()

if __name__ == "__main__":
    test_camera()
