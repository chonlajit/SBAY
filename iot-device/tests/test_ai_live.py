# ========================================================
# SBAY Smart Bin - Test AI Live Detection with Sort Servo
# ทดสอบ AI แบบเรียลไทม์ พร้อมปรับกรอบ Crop และหมุน Sort Servo
# ========================================================

import os
import sys
import time
import cv2
import threading

# เพิ่ม Path ให้มองเห็นโฟลเดอร์ปัจจุบัน
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
    print(f"⚠️ Servo Hardware PWM ไม่พร้อมใช้งาน: {e}")

current_servo_angle = DEFAULT_SORT_ANGLE
is_servo_moving = False
servo_lock = threading.Lock()


def rotate_servo_async(angle):
    """หมุน Sort Servo ใน Background Thread เพื่อให้วิดีโอสดไหลลื่น 30 FPS ไม่สะดุด"""
    global is_servo_moving, current_servo_angle
    with servo_lock:
        if is_servo_moving:
            return
        is_servo_moving = True
        current_servo_angle = angle

    def _worker():
        global is_servo_moving
        try:
            if SERVO_AVAILABLE and servo_module:
                servo_module.set_angle(servo_module.SERVO_SORT_PIN, angle)
            else:
                time.sleep(0.2)
        except Exception as e:
            print(f"❌ สั่งหมุน Servo ไม่สำเร็จ: {e}")
        finally:
            with servo_lock:
                is_servo_moving = False

    threading.Thread(target=_worker, daemon=True).start()


def nothing(x):
    pass


def main():
    print("="*60)
    print("🤖 เริ่มการทดสอบ AI แบบเรียลไทม์ พร้อมหมุน Sort Servo (Live Detection)")
    print("="*60)
    print("ปุ่มลัดบนหน้าต่างภาพ:")
    print("  [1] หมุน Sort Servo ไปมุมขวดพลาสติก (260°)")
    print("  [2] หมุน Sort Servo ไปมุมกระป๋อง (200°)")
    print("  [3] หมุน Sort Servo ไปมุมกล่อง (320°)")
    print("  [4] หมุน Sort Servo ไปมุมคืนขวด (140°)")
    print("  [ [ ] และ [ ] ] : ลด / เพิ่มมุม Sort Servo ทีละ 10°")
    print("  [q] หรือ [ESC] : ออกจากโปรแกรม")
    print("="*60)

    print(f"📦 กำลังโหลดโมเดล: {MODEL_PATH} ...")
    try:
        detector = Detector(MODEL_PATH)
        print("✅ โหลดโมเดลสำเร็จ!")
    except Exception as e:
        print(f"❌ โหลดโมเดลไม่สำเร็จ: {e}")
        sys.exit(1)

    print("⏳ กำลังเปิดกล้อง...")
    stream = CameraStream(width=1280, height=720).start()
    time.sleep(1.0)
    print(f"✅ เปิดกล้องสำเร็จ: {stream.camera_type}")

    # หมุน Servo ไปที่ค่าเริ่มต้น
    if SERVO_AVAILABLE:
        rotate_servo_async(DEFAULT_SORT_ANGLE)

    # สร้างหน้าต่างสำหรับปรับตั้งค่า (Trackbars)
    cv2.namedWindow("Settings", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Settings", 450, 320)
    
    # ค่าเริ่มต้น (ดึงจาก config.py)
    cv2.createTrackbar("Top (%)", "Settings", int(CROP_TOP_PCT * 100), 100, nothing)
    cv2.createTrackbar("Bottom (%)", "Settings", int(CROP_BOTTOM_PCT * 100), 100, nothing)
    cv2.createTrackbar("Left (%)", "Settings", int(CROP_LEFT_PCT * 100), 100, nothing)
    cv2.createTrackbar("Right (%)", "Settings", int(CROP_RIGHT_PCT * 100), 100, nothing)
    cv2.createTrackbar("Sort Angle", "Settings", int(DEFAULT_SORT_ANGLE), 360, nothing)

    last_trackbar_angle = int(DEFAULT_SORT_ANGLE)

    print("🎥 กำลังแสดงผลภาพสด... (กด 'q' ที่หน้าต่างภาพเพื่อออก)")
    
    try:
        while True:
            # ดึงภาพจากกล้อง
            raw_bgr = stream.get_frame()
            frame_rgb = cv2.cvtColor(raw_bgr, cv2.COLOR_BGR2RGB)
            h, w = frame_rgb.shape[:2]

            # อ่านค่าจาก Trackbars
            top_pct = cv2.getTrackbarPos("Top (%)", "Settings")
            bottom_pct = cv2.getTrackbarPos("Bottom (%)", "Settings")
            left_pct = cv2.getTrackbarPos("Left (%)", "Settings")
            right_pct = cv2.getTrackbarPos("Right (%)", "Settings")
            trackbar_angle = cv2.getTrackbarPos("Sort Angle", "Settings")

            # เช็คว่าผู้ใช้เลื่อน Slider องศาหรือไม่
            if trackbar_angle != last_trackbar_angle:
                last_trackbar_angle = trackbar_angle
                rotate_servo_async(trackbar_angle)

            # ป้องกันค่าติดลบ หรือค่าทับกัน
            if top_pct >= bottom_pct:
                bottom_pct = min(top_pct + 1, 100)
                cv2.setTrackbarPos("Bottom (%)", "Settings", bottom_pct)
            if left_pct >= right_pct:
                right_pct = min(left_pct + 1, 100)
                cv2.setTrackbarPos("Right (%)", "Settings", right_pct)

            y1 = int(h * (top_pct / 100.0))
            y2 = int(h * (bottom_pct / 100.0))
            x1 = int(w * (left_pct / 100.0))
            x2 = int(w * (right_pct / 100.0))

            # ครอปภาพ (Crop) ตามค่าที่ปรับ
            cropped_frame = frame_rgb[y1:y2, x1:x2]

            if cropped_frame.shape[0] < 10 or cropped_frame.shape[1] < 10:
                annotated_frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
                cv2.putText(annotated_frame_bgr, "Crop area too small!", (10, 50), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            else:
                # รัน AI บนภาพที่ครอปแล้ว
                detections, annotated_frame_rgb = detector.detect(cropped_frame)
                annotated_frame_bgr = cv2.cvtColor(annotated_frame_rgb, cv2.COLOR_RGB2BGR)

                # แสดงข้อมูลค่าที่ตั้งไว้บนภาพ
                servo_status = "MOVING..." if is_servo_moving else "STABLE"
                info_text1 = f"Found: {len(detections)} items"
                info_text2 = f"Sort Angle: {current_servo_angle} deg [{servo_status}]"
                info_text3 = f"Crop Y:{top_pct}-{bottom_pct}% | X:{left_pct}-{right_pct}%"
                
                cv2.putText(annotated_frame_bgr, info_text1, (10, 30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 0), 2)
                cv2.putText(annotated_frame_bgr, info_text2, (10, 62), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 220, 255), 2)
                cv2.putText(annotated_frame_bgr, info_text3, (10, 92), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 0), 1)

            # แสดงภาพสดที่มี Bounding Box
            cv2.imshow("AI Live Detection (Press 'q' to quit)", annotated_frame_bgr)

            # ตรวจสอบการกดปุ่มบนหน้าต่าง
            key = cv2.waitKey(20) & 0xFF
            if key == 27 or key == ord('q'):
                print("🛑 ได้รับคำสั่งหยุดการทำงาน...")
                print("\n" + "="*45)
                print("📌 ค่าคอนฟิก Crop ล่าสุด:")
                print(f"CROP_TOP_PCT    = {top_pct/100:.2f}")
                print(f"CROP_BOTTOM_PCT = {bottom_pct/100:.2f}")
                print(f"CROP_LEFT_PCT   = {left_pct/100:.2f}")
                print(f"CROP_RIGHT_PCT  = {right_pct/100:.2f}")
                print("="*45 + "\n")
                break

            elif key == ord('1'):
                cv2.setTrackbarPos("Sort Angle", "Settings", int(SORT_ANGLE_PLASTIC))
            elif key == ord('2'):
                cv2.setTrackbarPos("Sort Angle", "Settings", int(SORT_ANGLE_CAN))
            elif key == ord('3'):
                cv2.setTrackbarPos("Sort Angle", "Settings", int(SORT_ANGLE_CARTON))
            elif key == ord('4'):
                cv2.setTrackbarPos("Sort Angle", "Settings", int(SORT_ANGLE_RETURN))
            elif key == ord('['):
                new_ang = max(0, current_servo_angle - 10)
                cv2.setTrackbarPos("Sort Angle", "Settings", int(new_ang))
            elif key == ord(']'):
                new_ang = min(360, current_servo_angle + 10)
                cv2.setTrackbarPos("Sort Angle", "Settings", int(new_ang))

    except KeyboardInterrupt:
        print("\n🛑 หยุดการทำงานโดยผู้ใช้ (Ctrl+C)")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
    finally:
        stream.stop()
        cv2.destroyAllWindows()
        if SERVO_AVAILABLE and servo_module:
            try:
                servo_module.cleanup()
            except Exception:
                pass
        print("🧹 ปิดระบบเรียบร้อย")


if __name__ == "__main__":
    main()
