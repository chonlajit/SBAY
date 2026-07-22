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
        picam = Picamera2()
        
        # เช็คจำนวนกล้องที่ระบบเห็น
        cameras = picam.global_camera_info()
        print(f"🔍 ระบบพบกล้องทั้งหมด: {len(cameras)} ตัว")
        
        if len(cameras) == 0:
            print("\n❌ [ERROR] ระบบไม่เจอกล้องเลยครับ!")
            print("  - อาจจะเสียบสายแพกลับด้าน")
            print("  - หรือสายแพเสีย/ขาดใน")
            print("  - หรือตัวเซ็นเซอร์กล้องเสีย")
            sys.exit(1)
            
        for i, cam in enumerate(cameras):
            print(f"  📷 กล้องที่ {i}: {cam}")
            
        print("\n⏳ กำลังพยายามเปิดกล้องและตั้งค่า...")
        config = picam.create_preview_configuration(main={"format": "BGR888", "size": (640, 480)})
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
