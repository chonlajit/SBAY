import time
import sys
import os
from config import USE_HARDWARE, USE_IR, USE_SERVO

print("="*50)
print("🤖 ระบบทดสอบ Infrared + Drop Servo")
print("="*50)

if not USE_HARDWARE:
    print("❌ ERROR: USE_HARDWARE ถูกตั้งเป็น false ใน .env")
    sys.exit(1)

if not USE_IR:
    print("❌ ERROR: USE_IR ถูกตั้งเป็น false ใน .env")
    sys.exit(1)

if not USE_SERVO:
    print("❌ ERROR: USE_SERVO ถูกตั้งเป็น false ใน .env")
    sys.exit(1)

try:
    from hardware.infrared import is_detected
    import hardware.servo as servo
except ImportError as e:
    print(f"❌ ERROR: ไม่สามารถโหลดโมดูลฮาร์ดแวร์ได้ ({e})")
    print("โปรดรันโปรแกรมนี้บน Raspberry Pi")
    sys.exit(1)

def run_test():
    print("🔄 กำลังรีเซ็ตมอเตอร์กลับสู่จุดศูนย์...")
    servo.reset_position()
    time.sleep(1)
    
    print("\n✅ ระบบพร้อมทำงาน! เอามือหรือขวดไปบังเซ็นเซอร์อินฟราเรดเพื่อทดสอบ...")
    print("กด Ctrl+C เพื่อออกจากโปรแกรม\n")
    
    try:
        while True:
            if is_detected():
                print("🎯 อินฟราเรด: ตรวจพบวัตถุ! -> ⏬ กำลังสั่ง Drop Servo...")
                servo.drop_item()
                print("⏳ รอให้เซ็นเซอร์ว่าง...")
                time.sleep(1.5) # ป้องกันการทำงานซ้ำรัวๆ
                
                # รอจนกว่าเอาขวด/มือออกจริงๆ ค่อยพร้อมสำหรับรอบใหม่
                while is_detected():
                    time.sleep(0.1)
                
                print("✅ พร้อมรับขวดชิ้นต่อไป...")
            
            time.sleep(0.1)
            
    except KeyboardInterrupt:
        print("\n🛑 หยุดการทำงานโดยผู้ใช้")
    finally:
        print("🧹 กำลังเคลียร์ค่า GPIO...")
        servo.cleanup()
        print("✅ เสร็จสิ้น")

if __name__ == "__main__":
    run_test()
