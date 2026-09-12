# ========================================================
# SBAY Smart Bin - Test Servo with Live Camera Preview
# ทดสอบการทำงานของ Servo พร้อมเปิดกล้องสด
# รองรับปุ่มกด 1-4 (4 คือทิศคืนขวด) ทั้งจากหน้าต่างกล้องและ Terminal
# ========================================================

import os
import sys
import time
import threading
import cv2

# เพิ่ม Path ให้มองเห็นโฟลเดอร์ bin-device และ root
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(root_dir, 'bin-device'))
sys.path.insert(0, root_dir)

import hardware.servo as servo
from vision.camera_preview import CameraStream, draw_hud

# ตัวแปรสถานะสำหรับการทำงาน
is_busy = False
current_action = ""
action_lock = threading.Lock()


def execute_servo_action(action_type, desc):
    """รันคำสั่ง Servo ใน Worker Thread เพื่อไม่ให้ภาพกล้องสะดุด"""
    global is_busy, current_action
    with action_lock:
        if is_busy:
            print(f"⚠️ มอเตอร์กำลังทำงานอยู่ โปรดรอสักครู่... (กำลังทำ: {current_action})")
            return
        is_busy = True
        current_action = desc

    def _worker():
        global is_busy, current_action
        try:
            print(f"\n⚙️ เริ่มคำสั่ง: {desc}")
            if action_type == '1':
                servo.sort_item("PLASTIC_BOTTLE")
                time.sleep(0.5)
                servo.release_item("PLASTIC_BOTTLE")
            elif action_type == '2':
                servo.sort_item("ALUMINUM_CAN")
                time.sleep(0.5)
                servo.release_item("ALUMINUM_CAN")
            elif action_type == '3':
                servo.sort_item("BEVERAGE_CARTON")
                time.sleep(0.5)
                servo.release_item("BEVERAGE_CARTON")
            elif action_type == '4':
                # ทิศคืนขวด: หมุนตัวปัดไปทิศคืนขวด + ปลดแผ่นรอง + สั่งเปิดช่องคืนขวด
                servo.return_bottle()
            elif action_type == 'd':
                servo.drop_item()
            elif action_type == 'u':
                servo.return_item()
            elif action_type == 'r':
                servo.reset_position()
            print(f"✅ ทำคำสั่งสำเร็จ: {desc}")
        except Exception as e:
            print(f"❌ เกิดข้อผิดพลาดขณะสั่ง Servo: {e}")
        finally:
            with action_lock:
                is_busy = False
                current_action = ""

    threading.Thread(target=_worker, daemon=True).start()


def test_servo():
    """ฟังก์ชันหลักสำหรับทดสอบ Servo พร้อมเปิดกล้องสด"""
    print("=" * 60)
    print("🤖 ระบบทดสอบ Servo พร้อมกล้องสด (SBAY Servo & Camera Test)")
    print("=" * 60)
    print("คำสั่งควบคุม (กดได้ทั้งที่หน้าต่างกล้อง และใน Terminal):")
    print("  [1] ขวดพลาสติก (PLASTIC_BOTTLE)")
    print("  [2] กระป๋องอลูมิเนียม (ALUMINUM_CAN)")
    print("  [3] กล่องเครื่องดื่ม (BEVERAGE_CARTON)")
    print("  [4] 🔄 ทิศคืนขวด (RETURN BOTTLE)")
    print("  [d] จำลองการรับขวด (Drop Servo)")
    print("  [u] จำลองเปิดช่องคืนขวด (Return Servo)")
    print("  [r] รีเซ็ตมอเตอร์กลับสู่จุดศูนย์ (Reset)")
    print("  [q / ESC] ออกจากโปรแกรม (Quit)")
    print("=" * 60)

    # 1. รีเซ็ต Servo
    print("⏳ กำลังรีเซ็ต Servo ไปที่จุดเริ่มต้น...")
    try:
        servo.reset_position()
        time.sleep(0.5)
        print("✅ รีเซ็ต Servo เรียบร้อย")
    except Exception as e:
        print(f"⚠️ ไม่สามารถรีเซ็ต Servo ได้: {e}")

    # 2. เริ่มต้นระบบกล้อง
    print("📷 กำลังเชื่อมต่อกล้อง...")
    stream = CameraStream(width=640, height=480).start()
    time.sleep(1.0)
    print(f"✅ เปิดกล้องสำเร็จ: {stream.camera_type}")

    window_name = "SBAY - Test Servo & Live Camera Feed"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 640, 480)

    running = True

    # 3. เธรดรับคีย์จาก Terminal (เพื่อความสะดวก)
    def terminal_listener():
        nonlocal running
        while running:
            try:
                cmd = input().strip().lower()
                if not running:
                    break
                if cmd == 'q':
                    running = False
                    break
                handle_key_action(cmd)
            except (EOFError, KeyboardInterrupt):
                running = False
                break

    def handle_key_action(key_str):
        if key_str == '1':
            execute_servo_action('1', "1: ขวดพลาสติก (Plastic)")
        elif key_str == '2':
            execute_servo_action('2', "2: กระป๋องอลูมิเนียม (Can)")
        elif key_str == '3':
            execute_servo_action('3', "3: กล่องกระดาษ (Carton)")
        elif key_str == '4':
            execute_servo_action('4', "4: ทิศคืนขวด (Return Bottle)")
        elif key_str == 'd':
            execute_servo_action('d', "Drop: รับขวดลงกล่อง")
        elif key_str == 'u':
            execute_servo_action('u', "Return: เปิดช่องคืนขวด")
        elif key_str == 'r':
            execute_servo_action('r', "Reset: คืนค่าจุดเริ่มต้น")

    term_thread = threading.Thread(target=terminal_listener, daemon=True)
    term_thread.start()

    menu_hud = "[1] Plastic  [2] Can  [3] Carton  [4] Return  [D] Drop  [R] Reset  [Q] Quit"

    try:
        while running:
            # ดึงภาพจากกล้อง
            frame = stream.get_frame()

            # สถานะปัจจุบัน
            if is_busy:
                action_text = f"RUNNING: {current_action}"
                status_text = "BUSY (Moving Servo)"
            else:
                action_text = ""
                status_text = "READY - Waiting for Key [1-4, d, r, q]"

            # วาด HUD
            hud_frame = draw_hud(
                frame=frame,
                title="SBAY SERVO & CAMERA TEST",
                menu_text=menu_hud,
                status_text=status_text,
                action_text=action_text,
                camera_type=stream.camera_type,
                fps=stream.fps,
                show_crosshair=True,
                show_crop=False
            )

            cv2.imshow(window_name, hud_frame)

            # ตรวจสอบการกดปุ่มบนหน้าต่างกล้อง
            key = cv2.waitKey(20) & 0xFF
            if key == 27 or key == ord('q') or key == ord('Q'):  # ESC หรือ 'q'
                print("\n👋 กำลังปิดโปรแกรม...")
                running = False
                break
            elif key in [ord('1'), ord('2'), ord('3'), ord('4'),
                         ord('d'), ord('D'), ord('u'), ord('U'),
                         ord('r'), ord('R')]:
                char_key = chr(key).lower()
                handle_key_action(char_key)

    except KeyboardInterrupt:
        print("\n🛑 ยกเลิกการทำงานโดยผู้ใช้ (Ctrl+C)")
    finally:
        running = False
        print("🧹 กำลังหยุดระบบกล้องและปิดหน้าต่าง...")
        try:
            cv2.destroyAllWindows()
        except Exception:
            pass
        stream.stop()

        print("🧹 กำลังเคลียร์ค่า Servo GPIO...")
        try:
            servo.cleanup()
        except Exception:
            pass
        print("✅ เสร็จสิ้น เรียบร้อย")


if __name__ == "__main__":
    test_servo()
