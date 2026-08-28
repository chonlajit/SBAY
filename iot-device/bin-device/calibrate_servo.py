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
            print("3. Servo Drop (ตัวเปิดรับขวด)")
            print("4. Servo Return (ตัวคืนขวด - อนาคต)")
            print("5. ออกจากโปรแกรม (หรือกด Ctrl+C)")
            choice = input("👉 ใส่ตัวเลข (1-5): ").strip()

            if choice == '5':
                break
            
            if choice not in ['1', '2', '3', '4']:
                print("❌ กรุณาเลือก 1-4 เท่านั้น")
                continue

            if choice == '1':
                target_pin = servo.SERVO_SORT_PIN
                servo_name = "Sort (ตัวปัด)"
                max_angle = 360
            elif choice == '2':
                target_pin = servo.SERVO_RELEASE_PIN
                servo_name = "Release (ตัวแผ่นรอง)"
                max_angle = 180
            elif choice == '3':
                target_pin = servo.SERVO_DROP_PIN
                servo_name = "Drop (ตัวรับขวด)"
                max_angle = 180
            else:
                target_pin = servo.SERVO_RETURN_PIN
                servo_name = "Return (ตัวคืนขวด)"
                max_angle = 180

            while True:
                angle_str = input(f"[{servo_name}] 👉 ป้อนค่าองศา (0 - {max_angle}) หรือพิมพ์ 'q' เพื่อกลับไปเลือกใหม่: ").strip()
                
                if angle_str.lower() == 'q':
                    break
                
                try:
                    angle = float(angle_str)
                    if 0 <= angle <= max_angle:
                        print(f"กำลังหมุน {servo_name} ไปที่ {angle} องศา...")
                        servo.set_angle(target_pin, angle)
                        print("✅ หมุนเสร็จสิ้น ลองสังเกตหน้างานดูว่าพอดีกับช่องหรือยัง")
                    else:
                        print(f"❌ กรุณาใส่ตัวเลขระหว่าง 0 ถึง {max_angle} เท่านั้น")
                except ValueError:
                    print("❌ กรุณาใส่เป็นตัวเลขเท่านั้น")

    except KeyboardInterrupt:
        print("\n🛑 ยกเลิกการตั้งค่า")
    finally:
        servo.cleanup()
        print("👋 ปิดโปรแกรมและคืนค่าระบบเรียบร้อย")

if __name__ == "__main__":
    run_calibration()
