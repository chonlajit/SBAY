#!/usr/bin/env python3
# ============================
# SBAY Smart Bin - Main Controller
# ไฟล์หลักที่จะรันบน Raspberry Pi
# รวม GUI + Detection + Session + API + Heartbeat
# ============================

import threading
import time
import logging
import sys
import os

# Add project root to path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(root_dir, 'bin-device'))
sys.path.insert(0, root_dir)

from settings.config import (
    DEVICE_ID, USE_GUI, USE_IR, USE_HARDWARE, USE_SERVO,
    DETECT_TIMEOUT, SORT_ANGLE_RETURN, RELEASE_ANGLE_RETURN,
    SERVO_HOLD_ON_DROP
)
from api_client import ApiClient
from heartbeat_service import HeartbeatService
from session_manager import SessionManager
from detection_service import DetectionService
from ultrasonic_service import UltrasonicService

# ============================
# Logging Setup
# ============================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("main")


class SmartBinController:
    """
    ควบคุม Flow ทั้งหมดของตู้ขยะ

    Flow:
    1. IDLE → รอผู้ใช้แตะหน้าจอ
    2. INPUT_PHONE → กรอกเบอร์โทร
    3. GET User จาก Backend
    4. WELCOME → แสดงชื่อ
    5. DETECTING → กล้องจับภาพ + AI detect (วนซ้ำ)
    6. ผู้ใช้กด "เสร็จสิ้น"
    7. SENDING → ส่ง session ไป Backend
    8. RESULT → แสดงผลสรุป
    9. กลับไป IDLE
    """

    def __init__(self):
        # Core services
        self.api_client = ApiClient()
        self.session = SessionManager()
        self.detection = DetectionService()
        self.heartbeat = HeartbeatService(self.api_client, DEVICE_ID, on_status_change=self._on_server_status_change)
        self.ultrasonic = UltrasonicService(self.api_client, DEVICE_ID)

        # GUI (optional)
        self.gui = None
        self.detecting = False

    def _on_server_status_change(self, is_online):
        """Callback เมื่อสถานะการเชื่อมต่อฐานข้อมูล/เซิร์ฟเวอร์เปลี่ยนไป"""
        if self.gui:
            self.gui.schedule(self.gui.set_server_status, is_online)

    def start(self):
        """เริ่มระบบทั้งหมด"""
        logger.info("=" * 50)
        logger.info("  SBAY Smart Bin Controller Starting...")
        logger.info(f"  Device ID: {DEVICE_ID}")
        logger.info(f"  GUI Mode: {USE_GUI}")
        logger.info("=" * 50)

        from settings.config import USE_HARDWARE, USE_SERVO
        if USE_HARDWARE:
            if USE_SERVO:
                try:
                    from hardware.servo import reset_position
                    logger.info("Resetting servos to default positions...")
                    reset_position()
                except Exception as e:
                    logger.error(f"Failed to reset servos: {e}")
            
            try:
                from hardware.led import set_bin_full_status, cleanup as cleanup_leds
                self.heartbeat.on_full_status_change = set_bin_full_status
                self.cleanup_leds = cleanup_leds
            except Exception as e:
                logger.error(f"Failed to init LED status callback: {e}")
                self.cleanup_leds = lambda: None

        # Start ultrasonic monitoring
        self.ultrasonic.start()

        # Start heartbeat
        self.heartbeat.start()
        
        import atexit
        if hasattr(self, 'cleanup_leds'):
            atexit.register(self.cleanup_leds)

        if USE_GUI:
            self._start_with_gui()
        else:
            self._start_cli()

    # ==============================
    # GUI MODE
    # ==============================
    def _start_with_gui(self):
        from gui import SmartBinGUI

        self.gui = SmartBinGUI(
            on_phone_submit=self._on_phone_submit,
            on_finish=self._on_finish
        )
        try:
            self.gui.run()
        finally:
            self.detecting = False
            self.heartbeat.stop()
            self.ultrasonic.stop()
            self.detection.stop_camera()

    def _on_phone_submit(self, phone):
        """Callback: ผู้ใช้กรอกเบอร์เสร็จ"""
        if phone:
            logger.info(f"Phone submitted: {phone}")
            user, status = self.api_client.get_user_by_phone(phone, return_status=True, retries=2)
        else:
            logger.info("Guest mode")
            user = None
            status = "OK"

        if user:
            user_id = user.get('id', '')
            # แสดง username แทนชื่อตามที่ผู้ใช้ต้องการ
            username = (
                user.get('username') or
                user.get('userName') or
                user.get('displayName') or
                f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or
                "User"
            )
            name = username
            alert_msg = None
            logger.info(f"User identified: {name} (ID: {user_id})")
        else:
            user_id = ""
            name = "Guest"
            if phone and status == "DB_ERROR":
                alert_msg = "⚠️ ติดต่อฐานข้อมูลไม่ได้! กำลังเข้าสู่โหมด Guest (บันทึกออฟไลน์)"
                logger.warning(f"Database/server error for phone {phone}. Auto-falling back to offline Guest mode.")
            elif phone and status == "NOT_FOUND":
                alert_msg = "ℹ️ ไม่พบเบอร์นี้ในระบบ (ดำเนินการในฐานะ Guest)"
            else:
                alert_msg = None

        # Start session
        self.session.start(DEVICE_ID, user_id, name)

        # Show welcome screen
        self.gui.schedule(self.gui.show_welcome, name, alert_msg)

        # Start detection loop in background
        self.detecting = True
        threading.Thread(target=self._detection_loop, daemon=True).start()

    def _detection_loop(self):
        """Background thread: วนตรวจจับขยะจากกล้องและ IR Sensor"""
        logger.info("Detection loop started (waiting for IR)")

        processing_item = False
        processing_start_time = 0

        while self.detecting:
            # ถ้า USE_IR=False กล้องจะเปิดตลอด
            if not USE_IR:
                if not self.detection.running:
                    if self.gui:
                        self.gui.schedule(self.gui.update_status, "สแตนด์บาย: รอการหยอดขยะ (กล้องทำงานตลอด)...", "#94a3b8")
                    self.detection.start_camera()
                    time.sleep(1.0)
            
            # 1. เช็คว่ามีของใหม่มาจ่อเซ็นเซอร์ไหม (เฉพาะตอนที่ยังไม่ได้กำลังวิเคราะห์ของเก่าอยู่)
            if not processing_item and (not USE_IR or self.detection.is_item_present()):
                if USE_IR:
                    if self.gui:
                        self.gui.schedule(self.gui.update_status, "กำลังรับขยะเข้าสู่ช่องวิเคราะห์...", "#eab308")

                    # 🛡️ สั่งให้ Release Servo เกร็งสู้ ล็อกตำแหน่งรองรับขวดก่อนเปิดบานพับตก
                    if SERVO_HOLD_ON_DROP:
                        try:
                            from hardware.servo import hold_torque, SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE
                            hold_torque(SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE)
                            logger.info("Engaged Release Servo hold torque (เกร็งสู้แรงกระแทกขวดตก)")
                        except Exception as e:
                            logger.warning(f"Failed to engage hold torque: {e}")
                    
                    self.detection.drop_item()  # เปิดบานพับให้ของตกเข้ามา
                    
                    if self.gui:
                        self.gui.schedule(self.gui.update_status, "กำลังเปิดกล้องและวิเคราะห์...", "#eab308")
                    
                    self.detection.start_camera()
                    time.sleep(1.0) # Wait for camera warmup
                else:
                    # กรณีไม่ใช้ IR ให้เกร็งสู้เมื่อเริ่มวิเคราะห์เช่นกัน
                    if SERVO_HOLD_ON_DROP:
                        try:
                            from hardware.servo import hold_torque, SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE
                            hold_torque(SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE)
                        except Exception:
                            pass
                
                # เปลี่ยนสถานะว่า "กำลังมีของอยู่ข้างในตู้ ให้กล้องวิเคราะห์ต่อไปเรื่อยๆ"
                processing_item = True
                processing_start_time = time.time()

            # 2. ถ้ามีของอยู่ข้างใน (หรือเปิดกล้องตลอดเวลา) ให้วิเคราะห์ AI
            if processing_item or not USE_IR:
                result = self.detection.detect_once(check_full_callback=self.ultrasonic.is_compartment_full)

                if self.gui and self.detection.latest_frame is not None:
                    frame_to_show = self.detection.latest_frame.copy()
                    self.gui.schedule(self.gui.update_camera_frame, frame_to_show)

                if result:
                    if result.get("returned"):
                        # ⚠️ ช่องปลายทางเต็ม AI คืนขยะออกทางช่อง Return ให้แล้ว ไม่คิดคะแนน
                        th_names = {
                            "PLASTIC_BOTTLE": "ขวดพลาสติก",
                            "ALUMINUM_CAN": "กระป๋อง",
                            "BEVERAGE_CARTON": "กล่องเครื่องดื่ม"
                        }
                        type_th = th_names.get(result["type"], result["type"])
                        logger.warning(f"Compartment for {result['type']} is full! Item returned.")

                        if USE_IR:
                            self.detection.stop_camera()

                        if self.gui:
                            self.gui.schedule(self.gui.update_status, f"⚠️ ช่อง {type_th} เต็มแล้ว! (คืนขยะเรียบร้อย)", "#ef4444")
                            time.sleep(3.0)
                            status_msg = "สแตนด์บาย: รอการหยอดขยะ (เซ็นเซอร์อินฟาเรด)" if USE_IR else "สแตนด์บาย: รอการหยอดขยะ (กล้องทำงานตลอด)"
                            self.gui.schedule(self.gui.update_status, status_msg, "#94a3b8")
                            self.gui.schedule(self.gui.update_camera_frame, None)

                        time.sleep(1.0)
                        processing_item = False
                    else:
                        # 🎯 AI ตรวจเจอขยะสำเร็จและเสถียรแล้ว
                        item = self.session.add_item(
                            item_type=result["type"],
                            size_ml=result["size_ml"],
                            weight=result["weight"],
                            score=result["score"]
                        )

                        if self.gui:
                            self.gui.schedule(
                                self.gui.add_detected_item,
                                result["type"],
                                result["size_ml"],
                                result["score"]
                            )
                        
                        if USE_IR:
                            self.detection.stop_camera()
                            
                        if self.gui:
                            status_msg = "สแตนด์บาย: รอการหยอดขยะ (เซ็นเซอร์อินฟาเรด)" if USE_IR else "สแตนด์บาย: รอการหยอดขยะ (กล้องทำงานตลอด)"
                            self.gui.schedule(self.gui.update_status, status_msg, "#94a3b8")
                            self.gui.schedule(self.gui.update_camera_frame, None)
                        
                        time.sleep(2.0) # Wait for item to sort/release completely
                        processing_item = False # กลับไปรอรับของชิ้นใหม่ได้
                    
                else:
                    # ⏳ AI ยังหาไม่เจอ หรือยังไม่เสถียร เช็คว่าหมดเวลา (Timeout) หรือยัง
                    # ถ้าเกินเวลา DETECT_TIMEOUT แล้ว AI ยังตรวจไม่พบขวด ให้หมุนคืนขวด (Return)
                    timeout_limit = float(DETECT_TIMEOUT) if DETECT_TIMEOUT else 10.0
                    has_timed_out = (processing_start_time > 0) and (time.time() - processing_start_time > timeout_limit)

                    if (USE_IR or processing_item) and has_timed_out:
                        logger.warning(f"Detection timeout ({timeout_limit}s) - no valid bottle found, returning item...")
                        
                        # สั่งคืนขวดตาม Flow: เปิดประตู Return -> หมุนไปทิศ Return -> ปล่อยขวด -> กลับทิศ Default -> ปิดประตู Return
                        try:
                            if USE_HARDWARE and USE_SERVO:
                                from hardware.servo import return_bottle
                                logger.info("Returning item via return_bottle()...")
                                return_bottle()
                            else:
                                logger.info("[SIMULATE] Returning item via return_bottle()")
                        except Exception as e:
                            logger.error(f"Failed to return item via servo: {e}")

                        if USE_IR:
                            self.detection.stop_camera()

                        if self.gui:
                            self.gui.schedule(self.gui.update_status, "ไม่พบขวด หรือขยะไม่ถูกต้อง (คืนขวดแล้ว)...", "#ef4444")
                            time.sleep(3.0)
                            status_msg = "สแตนด์บาย: รอการหยอดขยะ (เซ็นเซอร์อินฟาเรด)" if USE_IR else "สแตนด์บาย: รอการหยอดขยะ (กล้องทำงานตลอด)"
                            self.gui.schedule(self.gui.update_status, status_msg, "#94a3b8")
                            self.gui.schedule(self.gui.update_camera_frame, None)

                        processing_item = False
                        processing_start_time = 0

            time.sleep(0.1)  # Prevent CPU spike

        self.detection.stop_camera()
        logger.info("Detection loop stopped")

    def _on_finish(self):
        """Callback: ผู้ใช้กดเสร็จสิ้น"""
        self.detecting = False  # Stop detection loop
        logger.info("User pressed finish")

        # ถ้าใน session ไม่มีไอเท็ม แต่ใน GUI มี (เช่น จากการทดสอบคีย์ลัด) ให้นำเข้า session
        if not self.session.has_items() and self.gui and getattr(self.gui, 'items_list', None):
            logger.info("Syncing GUI items into session...")
            for it in self.gui.items_list:
                self.session.add_item(
                    item_type=it.get("type", "PLASTIC_BOTTLE"),
                    size_ml=it.get("ml", 500),
                    weight=0.0,
                    score=it.get("score", 1.0)
                )

        if not self.session.has_items():
            logger.info("No items in session, displaying result screen (0 items) before idle")
            if self.gui:
                self.gui.schedule(self.gui.show_result, 0, 0, 0.0, True)
            return

        # Show sending screen
        if self.gui:
            self.gui.schedule(self.gui.show_sending)

        # Send in background
        threading.Thread(target=self._send_session, daemon=True).start()

    def _send_session(self):
        """ส่ง session ไป Backend"""
        summary = {"totalItems": 0, "totalMl": 0.0, "totalScore": 0.0}
        success = False
        try:
            summary = self.session.get_summary()
            payload = self.session.to_payload()
            logger.info(f"Sending session: {summary}")
            success = self.api_client.post_session(payload)
        except Exception as e:
            logger.error(f"Error sending session: {e}")
            try:
                summary = self.session.get_summary()
            except Exception:
                pass
            success = False

        # Show result
        if self.gui:
            self.gui.schedule(
                self.gui.show_result,
                summary.get("totalItems", 0),
                summary.get("totalMl", 0.0),
                summary.get("totalScore", 0.0),
                success
            )

        # Reset
        try:
            self.session.reset()
        except Exception:
            pass

    # ==============================
    # CLI MODE (สำหรับทดสอบ)
    # ==============================
    def _start_cli(self):
        """โหมด CLI สำหรับทดสอบโดยไม่มีหน้าจอ"""
        logger.info("Running in CLI mode...")

        try:
            while True:
                print("\n" + "=" * 40)
                phone = input("📱 กรอกเบอร์โทร (หรือ Enter เพื่อเป็น Guest, q เพื่อออก): ").strip()

                if phone.lower() == 'q':
                    break

                # Lookup user
                if phone:
                    user, status = self.api_client.get_user_by_phone(phone, return_status=True, retries=2)
                else:
                    user = None
                    status = "OK"

                if user:
                    user_id = user.get('id', '')
                    username = (
                        user.get('username') or
                        user.get('userName') or
                        user.get('displayName') or
                        f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or
                        "User"
                    )
                    name = username
                    print(f"👋 สวัสดีคุณ {name} (Username)!")
                else:
                    user_id = ""
                    name = "Guest"
                    if phone and status == "DB_ERROR":
                        print("⚠️ ติดต่อฐานข้อมูลไม่ได้! เข้าสู่โหมด Guest (บันทึกออฟไลน์)")
                    elif phone:
                        print("ℹ️ ไม่พบบัญชีสำหรับเบอร์นี้ ดำเนินการในฐานะ Guest")
                    else:
                        print("👋 สวัสดี Guest!")

                # Start session
                self.session.start(DEVICE_ID, user_id, name)

                # Detection loop (CLI simulated)
                print("\n🔍 กำลังรอการหยอดขยะ...")
                print("   พิมพ์ชนิดขยะ: bottle, can, carton")
                print("   พิมพ์ 'done' เพื่อเสร็จสิ้น\n")

                while True:
                    cmd = input("  → หยอดขยะ: ").strip().lower()

                    if cmd == 'done':
                        break

                    # Map simple input to types
                    type_map = {
                        'bottle': 'PLASTIC_BOTTLE',
                        'plastic': 'PLASTIC_BOTTLE',
                        'can': 'ALUMINUM_CAN',
                        'aluminum': 'ALUMINUM_CAN',
                        'carton': 'BEVERAGE_CARTON',
                        'paper': 'BEVERAGE_CARTON',
                        'box': 'BEVERAGE_CARTON'
                    }

                    item_type = type_map.get(cmd)
                    if not item_type:
                        print(f"    ❌ ไม่รู้จักประเภท '{cmd}'")
                        continue

                    # Simulate detection
                    from size.estimator import SizeEstimator
                    from scoring.calculator import ScoreCalculator

                    size_ml = SizeEstimator().get_size_ml(50, 150)  # mock width and height
                    result = ScoreCalculator().calculate(item_type, size_ml)

                    item = self.session.add_item(item_type, size_ml, result["weight"], result["score"])
                    print(f"    ✅ {item_type} → {size_ml}ml | +{result['score']:.1f} pt")

                # Finish
                if not self.session.has_items():
                    print("\n📭 ไม่มีรายการ กลับหน้าหลัก")
                    self.session.reset()
                    continue

                summary = self.session.get_summary()
                print(f"\n📊 สรุป: {summary['totalItems']} ชิ้น | {summary['totalMl']}ml | +{summary['totalScore']} pt")

                # Send
                print("📡 กำลังส่งข้อมูล...")
                payload = self.session.to_payload()
                success = self.api_client.post_session(payload)

                if success:
                    print("✅ ส่งสำเร็จ!")
                else:
                    print("⚠️ ส่งไม่สำเร็จ - เก็บไว้ใน offline queue แล้ว")

                self.session.reset()

        except KeyboardInterrupt:
            print("\n\n🛑 กำลังปิดระบบ...")
        finally:
            self.heartbeat.stop()
            self.ultrasonic.stop()
            self.detection.stop_camera()
            print("👋 ปิดระบบเรียบร้อย")


# ============================
# Entry Point
# ============================
if __name__ == "__main__":
    controller = SmartBinController()
    controller.start()

