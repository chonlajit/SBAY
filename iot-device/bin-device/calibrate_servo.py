import RPi.GPIO as GPIO
import time
import sys
import hardware.servo as servo

def run_calibration():
    servo.reset_position()
    print("="*50)
    print("🔧 โปรแกรมหาค่าองศาที่เหมาะสมสำหรับ Servo (Calibration)")
    print("="*50)

    try:
        while True:
            print("\nเลือก Servo ที่ต้องการทดสอบ:")
            print("1. Servo Sort (ตัวปัดคัดแยกขยะ)")
            print("2. Servo Release (ตัวแผ่นรองปล่อยขยะ)")
            print("3. ออกจากโปรแกรม (หรือกด Ctrl+C)")
            choice = input("👉 ใส่ตัวเลข (1-3): ").strip()

            if choice == '3':
                break
            
            if choice not in ['1', '2']:
                print("❌ กรุณาเลือก 1 หรือ 2 เท่านั้น")
                continue

            target_pin = servo.SERVO_SORT_PIN if choice == '1' else servo.SERVO_RELEASE_PIN
            servo_name = "Sort (ตัวปัด)" if choice == '1' else "Release (ตัวแผ่นรอง)"

            while True:
                angle_str = input(f"[{servo_name}] 👉 ป้อนค่าองศา (0 - 180) หรือพิมพ์ 'q' เพื่อกลับไปเลือกใหม่: ").strip()
                
                if angle_str.lower() == 'q':
                    break
                
                try:
                    angle = int(angle_str)
                    if 0 <= angle <= 180:
                        print(f"กำลังหมุน {servo_name} ไปที่ {angle} องศา...")
                        servo.set_angle(target_pin, angle)
                        print("✅ หมุนเสร็จสิ้น ลองสังเกตหน้างานดูว่าพอดีกับช่องหรือยัง")
                    else:
                        print("❌ กรุณาใส่ตัวเลขระหว่าง 0 ถึง 180 เท่านั้น")
                except ValueError:
                    print("❌ กรุณาใส่เป็นตัวเลขเท่านั้น")

    except KeyboardInterrupt:
        print("\n🛑 ยกเลิกการตั้งค่า")
    finally:
        servo.cleanup()
        print("👋 ปิดโปรแกรมและคืนค่าระบบเรียบร้อย")

if __name__ == "__main__":
    run_calibration()
