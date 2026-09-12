# ========================================================
# SBAY Smart Bin - Test AI (YOLO Detection) with Sort Servo
# ทดสอบโมเดล AI ตรวจจับขยะ ควบคู่กับการหมุน Sort Servo หลากมุม
# ========================================================

import os
import sys
import time
import cv2

# เพิ่ม Path ให้มองเห็นโฟลเดอร์ bin-device และ root
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(root_dir, 'bin-device'))
sys.path.insert(0, root_dir)

from settings.config import (
    MODEL_PATH,
    CROP_TOP_PCT, CROP_BOTTOM_PCT, CROP_LEFT_PCT, CROP_RIGHT_PCT,
    DEFAULT_SORT_ANGLE, SORT_ANGLE_PLASTIC, SORT_ANGLE_CAN,
    SORT_ANGLE_CARTON, SORT_ANGLE_RETURN
)
from vision.detector import Detector
from vision.camera_preview import CameraStream

# โหลดโมดูล Servo แบบปลอดภัย
servo_module = None
try:
    import hardware.servo as servo
    servo_module = servo
    SERVO_AVAILABLE = True
except (SystemExit, Exception) as e:
    SERVO_AVAILABLE = False
    print(f"⚠️ ไม่สามารถเชื่อมต่อ Hardware PWM สำหรับ Servo ได้: {e}")
    print("  (จะทำงานในโหมดจำลองการหมุน Servo แทน)")


def rotate_sort_servo(angle):
    """หมุน Sort Servo ไปยังองศาที่กำหนด (0 - 360)"""
    if SERVO_AVAILABLE and servo_module:
        try:
            print(f"⚙️ กำลังหมุน Sort Servo ไปที่ {angle}°...")
            servo_module.set_angle(servo_module.SERVO_SORT_PIN, angle)
            time.sleep(0.8)  # รอให้มอเตอร์และวัตถุหยุดนิ่ง
            return True
        except Exception as e:
            print(f"❌ สั่งหมุน Servo ไม่สำเร็จ: {e}")
            return False
    else:
        print(f"🔄 [SIMULATE] จำลองการหมุน Sort Servo ไปที่ {angle}°")
        time.sleep(0.3)
        return True


def capture_and_detect(stream, detector, angle=None):
    """ถ่ายภาพจากกล้อง ครอปภาพ และรันโมเดล AI"""
    # ดึงภาพจากกล้อง (ภาพผ่านการหมุน CAMERA_ROTATION เรียบร้อยแล้ว)
    raw_bgr = stream.get_frame()
    
    # แปลงสี BGR เป็น RGB สำหรับส่งให้ YOLO
    frame_rgb = cv2.cvtColor(raw_bgr, cv2.COLOR_BGR2RGB)
    h, w = frame_rgb.shape[:2]

    # ครอปภาพตามค่าใน config.py
    y1, y2 = int(h * CROP_TOP_PCT), int(h * CROP_BOTTOM_PCT)
    x1, x2 = int(w * CROP_LEFT_PCT), int(w * CROP_RIGHT_PCT)
    cropped_rgb = frame_rgb[y1:y2, x1:x2]

    # รัน AI
    start_time = time.time()
    detections, annotated_rgb = detector.detect(cropped_rgb)
    duration = time.time() - start_time

    # แสดงผลทาง Terminal
    angle_label = f" ที่มุม {angle}°" if angle is not None else ""
    print("-" * 50)
    print(f"⏱️ เวลาที่ใช้วิเคราะห์{angle_label}: {duration:.2f} วินาที")

    if len(detections) == 0:
        print("🤷‍♂️ AI ตรวจไม่พบวัตถุในภาพ")
    else:
        print(f"🎯 ตรวจพบวัตถุทั้งหมด {len(detections)} ชิ้น:")
        for i, det in enumerate(detections):
            label = det['label']
            conf = det['confidence'] * 100
            w_px = det['width']
            h_px = det['height']
            print(f"  {i+1}. ประเภท: {label} (ความมั่นใจ {conf:.1f}%) | ขนาด: W:{w_px}px x H:{h_px}px")

    # บันทึกภาพผลลัพธ์
    angle_suffix = f"_{int(angle)}deg" if angle is not None else ""
    filename = f"test_ai_result{angle_suffix}.jpg"
    
    # แปลงสีกลับเป็น BGR ก่อนเซฟ
    save_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)
    cv2.imwrite(filename, save_bgr)
    # บันทึกลงไฟล์ latest เสมอ
    cv2.imwrite("test_ai_result_latest.jpg", save_bgr)
    print(f"🖼️ บันทึกภาพพร้อมตีกรอบ AI ไว้ที่: {filename}")
    print("-" * 50)

    return detections


def run_multi_angle_sweep(stream, detector):
    """โหมดสแกนหลายมุมอัตโนมัติ (Auto Sweep) เพื่อเปรียบเทียบผล AI แต่ละมุม"""
    preset_angles = [
        ("140° (คืนขวด/Return)", SORT_ANGLE_RETURN),
        ("200° (กระป๋อง/Can)", SORT_ANGLE_CAN),
        ("260° (ขวดพลาสติก/Plastic)", SORT_ANGLE_PLASTIC),
        ("320° (กล่องเครื่องดื่ม/Carton)", SORT_ANGLE_CARTON),
    ]

    print("\n" + "=" * 60)
    print("🔄 เริ่มการสแกนหลายมุมอัตโนมัติ (Multi-Angle Sweep)...")
    print("=" * 60)

    results_summary = []

    for name, ang in preset_angles:
        print(f"\n👉 [กำลังทดสอบมุม: {name}]")
        rotate_sort_servo(ang)
        detections = capture_and_detect(stream, detector, angle=ang)
        
        if len(detections) > 0:
            top_det = detections[0]
            summary_info = f"{top_det['label']} ({top_det['confidence']*100:.1f}%)"
        else:
            summary_info = "ไม่พบวัตถุ (No Detection)"

        results_summary.append((name, ang, len(detections), summary_info))
        time.sleep(1.0)

    # พิมพ์ตารางสรุปผล
    print("\n" + "=" * 65)
    print("📊 สรุปผลการทดสอบ AI ตรวจจับในแต่ละมุมของ Sort Servo:")
    print("=" * 65)
    print(f"{'มุมที่ทดสอบ':<30} | {'จำนวน':<7} | {'ผลการตรวจจับ AI'}")
    print("-" * 65)
    for name, ang, count, info in results_summary:
        print(f"{name:<30} | {count:<7} | {info}")
    print("=" * 65)
    print("🖼️ สามารถดูไฟล์ภาพของแต่ละมุมได้ที่: test_ai_result_<องศา>deg.jpg\n")


def main():
    print("=" * 60)
    print("🤖 โปรแกรมทดสอบ AI (YOLO Detection) ร่วมกับการหมุน Sort Servo")
    print("=" * 60)

    # 1. โหลดโมเดล
    print(f"📦 กำลังโหลดโมเดล: {MODEL_PATH} ...")
    try:
        detector = Detector(MODEL_PATH)
        print("✅ โหลดโมเดลสำเร็จ!")
    except Exception as e:
        print(f"❌ โหลดโมเดลไม่สำเร็จ: {e}")
        sys.exit(1)

    # 2. เริ่มต้นระบบกล้อง
    print("📷 กำลังเชื่อมต่อกล้อง...")
    stream = CameraStream(width=1280, height=720).start()
    time.sleep(1.0)
    print(f"✅ เปิดกล้องสำเร็จ: {stream.camera_type}")

    # 3. ตั้งค่าองศาเริ่มต้น
    current_angle = DEFAULT_SORT_ANGLE
    if SERVO_AVAILABLE:
        print(f"🔄 รีเซ็ต Sort Servo ไปที่มุมเริ่มต้น ({current_angle}°)...")
        rotate_sort_servo(current_angle)

    try:
        while True:
            print("\n" + "-" * 50)
            print(f"📍 มุม Sort Servo ปัจจุบัน: {current_angle}°")
            print("👉 เลือกคำสั่งที่ต้องการทดสอบ:")
            print("  [Enter]  : ถ่ายภาพและวิเคราะห์มุมปัจจุบันทันที")
            print("  [ตัวเลข] : ป้อนองศาที่ต้องการ (0 - 360) แล้วหมุน + วิเคราะห์ AI")
            print(f"  [1]      : หมุนไปมุมขวดพลาสติก ({SORT_ANGLE_PLASTIC}°) + วิเคราะห์ AI")
            print(f"  [2]      : หมุนไปมุมกระป๋อง ({SORT_ANGLE_CAN}°) + วิเคราะห์ AI")
            print(f"  [3]      : หมุนไปมุมกล่อง ({SORT_ANGLE_CARTON}°) + วิเคราะห์ AI")
            print(f"  [4]      : หมุนไปมุมคืนขวด ({SORT_ANGLE_RETURN}°) + วิเคราะห์ AI")
            print("  [s]      : สแกนทดสอบทุกมุมอัตโนมัติ (Multi-Angle Sweep: 140°, 200°, 260°, 320°)")
            print("  [r]      : รีเซ็ต Sort Servo กลับจุดศูนย์")
            print("  [q]      : ออกจากโปรแกรม")

            cmd = input("👉 ใส่ตัวเลือก: ").strip().lower()

            if cmd == 'q':
                print("👋 กำลังปิดโปรแกรม...")
                break

            elif cmd == '' or cmd == 'c':
                # วิเคราะห์มุมปัจจุบัน
                capture_and_detect(stream, detector, angle=current_angle)

            elif cmd == '1':
                current_angle = SORT_ANGLE_PLASTIC
                rotate_sort_servo(current_angle)
                capture_and_detect(stream, detector, angle=current_angle)

            elif cmd == '2':
                current_angle = SORT_ANGLE_CAN
                rotate_sort_servo(current_angle)
                capture_and_detect(stream, detector, angle=current_angle)

            elif cmd == '3':
                current_angle = SORT_ANGLE_CARTON
                rotate_sort_servo(current_angle)
                capture_and_detect(stream, detector, angle=current_angle)

            elif cmd == '4':
                current_angle = SORT_ANGLE_RETURN
                rotate_sort_servo(current_angle)
                capture_and_detect(stream, detector, angle=current_angle)

            elif cmd in ['s', 'sweep', 'all']:
                run_multi_angle_sweep(stream, detector)

            elif cmd == 'r':
                current_angle = DEFAULT_SORT_ANGLE
                rotate_sort_servo(current_angle)
                print(f"✅ รีเซ็ต Sort Servo กลับไปที่ {current_angle}° เรียบร้อย")

            else:
                # ลองแปลงเป็นตัวเลของศา
                try:
                    target_angle = float(cmd)
                    if 0 <= target_angle <= 360:
                        current_angle = target_angle
                        rotate_sort_servo(current_angle)
                        capture_and_detect(stream, detector, angle=current_angle)
                    else:
                        print("❌ กรุณาใส่องศาระหว่าง 0 ถึง 360 องศา")
                except ValueError:
                    print("❌ ตัวเลือกไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง")

    except KeyboardInterrupt:
        print("\n🛑 ยกเลิกการทำงานโดยผู้ใช้ (Ctrl+C)")
    finally:
        print("🧹 กำลังหยุดระบบกล้อง...")
        stream.stop()
        if SERVO_AVAILABLE and servo_module:
            print("🧹 กำลังเคลียร์ค่าระบบ Servo...")
            try:
                servo_module.cleanup()
            except Exception:
                pass
        print("✅ ปิดโปรแกรมเรียบร้อย")


if __name__ == "__main__":
    main()
