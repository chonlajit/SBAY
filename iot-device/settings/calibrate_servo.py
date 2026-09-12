import os
import sys
import time

# เพิ่ม Path ให้มองเห็นโฟลเดอร์ bin-device และ root
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(root_dir, 'bin-device'))
sys.path.insert(0, root_dir)

import hardware.servo as servo
from vision.camera_preview import LiveCameraWindow


def run_calibration():
    print("=" * 60)
    print("🔧 โปรแกรมหาค่าองศาที่เหมาะสมสำหรับ Servo พร้อมกล้องสด (Calibration)")
    print("=" * 60)

    # 1. รีเซ็ต Servo ไปที่ตำแหน่งเริ่มต้น
    print("⏳ กำลังรีเซ็ต Servo ไปที่จุดเริ่มต้น...")
    try:
        servo.reset_position()
        time.sleep(0.5)
        print("✅ รีเซ็ตตำแหน่ง Servo เรียบร้อย")
    except Exception as e:
        print(f"⚠️ ไม่สามารถรีเซ็ต Servo ได้: {e}")

    # 2. เปิดหน้าต่างกล้องสด
    print("📷 กำลังเริ่มต้นหน้าต่างกล้องสด...")
    cam_window = LiveCameraWindow(
        window_name="SBAY - Live Camera View (Calibration)",
        title="SERVO CALIBRATION - CAMERA VIEW",
        menu_text="Observe chute/flap position in real-time | Enter angle in Terminal",
        show_crosshair=True,
        show_crop=True
    ).start()
    time.sleep(1.0)
    print("✅ หน้าต่างกล้องสดพร้อมทำงานแล้ว (สังเกตตำแหน่งชิ้นงานและมุมกล้องได้ทันที)")

    try:
        while True:
            cam_window.set_status("Select servo (1-4) in terminal")
            print("\nเลือก Servo ที่ต้องการทดสอบ:")
            print("1. Servo Sort (ตัวปัดคัดแยกขยะ - ค่าปัจจุบัน: พลาสติก 260°, กระป๋อง 200°, กล่อง 320°, คืนขวด 140°)")
            print("2. Servo Release (ตัวแผ่นรองปล่อยขยะ - ค่าปัจจุบัน: 60°-104°)")
            print("3. Servo Drop (ตัวเปิดรับขวด)")
            print("4. Servo Return (ตัวคืนขวด)")
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
                servo_name = "Drop (ตัวรับขวด - มอเตอร์ 180 องศา)"
                max_angle = 180
            else:
                target_pin = servo.SERVO_RETURN_PIN
                servo_name = "Return (ตัวคืนขวด - มอเตอร์ 180 องศา)"
                max_angle = 180

            cam_window.set_status(f"Calibrating {servo_name}")
            cam_window.set_calibration_info(servo_name, 0.0)

            print(f"\n--- เริ่มปรับแต่ง: {servo_name} (องศา 0 - {max_angle}) ---")
            print("💡 สังเกตภาพในหน้าต่างกล้องสดควบคู่ไปด้วย เพื่อดูว่าก้าน/แผ่นรองลงล็อกพอดีหรือไม่")

            while True:
                angle_str = input(f"[{servo_name}] 👉 ป้อนค่าองศา (0 - {max_angle}) หรือพิมพ์ 'q' เพื่อกลับไปเลือกใหม่: ").strip()

                if angle_str.lower() == 'q':
                    cam_window.set_calibration_info(None, None)
                    break

                try:
                    angle = float(angle_str)
                    if 0 <= angle <= max_angle:
                        print(f"กำลังหมุน {servo_name} ไปที่ {angle} องศา...")
                        cam_window.set_action(f"Moving {servo_name} -> {angle} deg")
                        cam_window.set_calibration_info(servo_name, angle)

                        servo.set_angle(target_pin, angle)
                        print("✅ หมุนเสร็จสิ้น ลองสังเกตหน้าต่างกล้องสดดูว่าพอดีกับช่องหรือยัง")
                    else:
                        print(f"❌ กรุณาใส่ตัวเลขระหว่าง 0 ถึง {max_angle} เท่านั้น")
                except ValueError:
                    print("❌ กรุณาใส่เป็นตัวเลขเท่านั้น")

    except KeyboardInterrupt:
        print("\n🛑 ยกเลิกการตั้งค่าโดยผู้ใช้")
    finally:
        print("🧹 กำลังปิดระบบกล้องสด...")
        cam_window.stop()

        print("🧹 กำลังเคลียร์ค่าระบบ Servo...")
        servo.cleanup()
        print("👋 ปิดโปรแกรมและคืนค่าระบบเรียบร้อย")


if __name__ == "__main__":
    run_calibration()
