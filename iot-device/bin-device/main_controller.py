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
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import DEVICE_ID, USE_GUI, USE_IR
from api_client import ApiClient
from heartbeat_service import HeartbeatService
from session_manager import SessionManager
from detection_service import DetectionService

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
        self.heartbeat = HeartbeatService(self.api_client, DEVICE_ID)

        # GUI (optional)
        self.gui = None
        self.detecting = False

    def start(self):
        """เริ่มระบบทั้งหมด"""
        logger.info("=" * 50)
        logger.info("  SBAY Smart Bin Controller Starting...")
        logger.info(f"  Device ID: {DEVICE_ID}")
        logger.info(f"  GUI Mode: {USE_GUI}")
        logger.info("=" * 50)

        # Start heartbeat
        self.heartbeat.start()

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
        self.gui.run()

    def _on_phone_submit(self, phone):
        """Callback: ผู้ใช้กรอกเบอร์เสร็จ"""
        if phone:
            logger.info(f"Phone submitted: {phone}")
            user = self.api_client.get_user_by_phone(phone)
        else:
            logger.info("Guest mode")
            user = None

        if user:
            user_id = user.get('id', '')
            name = f"{user.get('firstName', '')} {user.get('lastName', '')}"
        else:
            user_id = ""
            name = "Guest"

        # Start session
        self.session.start(DEVICE_ID, user_id, name)

        # Show welcome screen
        self.gui.schedule(self.gui.show_welcome, name)

        # Start detection loop in background
        self.detecting = True
        threading.Thread(target=self._detection_loop, daemon=True).start()

    def _detection_loop(self):
        """Background thread: วนตรวจจับขยะจากกล้องและ IR Sensor"""
        logger.info("Detection loop started (waiting for IR)")

        while self.detecting:
            if self.detection.is_item_present():
                if not self.detection.running:
                    if self.gui:
                        self.gui.schedule(self.gui.update_status, "กำลังเปิดกล้องและวิเคราะห์...", "#eab308")
                    self.detection.start_camera()
                    time.sleep(1.0) # Wait for camera warmup

                result = self.detection.detect_once()

                if result:
                    item = self.session.add_item(
                        item_type=result["type"],
                        size_ml=result["size_ml"],
                        weight=result["weight"],
                        score=result["score"]
                    )

                    # Update GUI (thread-safe)
                    if self.gui:
                        self.gui.schedule(
                            self.gui.add_detected_item,
                            result["type"],
                            result["size_ml"],
                            result["score"]
                        )
                    
                    self.detection.stop_camera()
                    if self.gui:
                        status_msg = "สแตนด์บาย: รอการหยอดขยะ (เซ็นเซอร์อินฟาเรด)" if USE_IR else "สแตนด์บาย: รอการหยอดขยะ (กล้องทำงานตลอด)"
                        self.gui.schedule(self.gui.update_status, status_msg, "#94a3b8")
                    time.sleep(2.0) # Wait for item to drop and IR to clear
            else:
                if self.detection.running:
                    self.detection.stop_camera()
                    if self.gui:
                        status_msg = "สแตนด์บาย: รอการหยอดขยะ (เซ็นเซอร์อินฟาเรด)" if USE_IR else "สแตนด์บาย: รอการหยอดขยะ (กล้องทำงานตลอด)"
                        self.gui.schedule(self.gui.update_status, status_msg, "#94a3b8")

            time.sleep(0.1)  # Prevent CPU spike

        self.detection.stop_camera()
        logger.info("Detection loop stopped")

    def _on_finish(self):
        """Callback: ผู้ใช้กดเสร็จสิ้น"""
        self.detecting = False  # Stop detection loop
        logger.info("User pressed finish")

        if not self.session.has_items():
            logger.info("No items in session, returning to idle")
            if self.gui:
                self.gui.schedule(self.gui.show_idle)
            return

        # Show sending screen
        if self.gui:
            self.gui.schedule(self.gui.show_sending)

        # Send in background
        threading.Thread(target=self._send_session, daemon=True).start()

    def _send_session(self):
        """ส่ง session ไป Backend"""
        summary = self.session.get_summary()
        payload = self.session.to_payload()

        logger.info(f"Sending session: {summary}")

        success = self.api_client.post_session(payload)

        # Show result
        if self.gui:
            self.gui.schedule(
                self.gui.show_result,
                summary["totalItems"],
                summary["totalMl"],
                summary["totalScore"],
                success
            )

        # Reset
        self.session.reset()

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
                    user = self.api_client.get_user_by_phone(phone)
                else:
                    user = None

                if user:
                    user_id = user.get('id', '')
                    name = f"{user.get('firstName', '')} {user.get('lastName', '')}"
                    print(f"👋 สวัสดี {name}!")
                else:
                    user_id = ""
                    name = "Guest"
                    print("👋 สวัสดี Guest!")

                # Start session
                self.session.start(DEVICE_ID, user_id, name)

                # Detection loop (CLI simulated)
                print("\n🔍 กำลังรอการหยอดขยะ...")
                print("   พิมพ์ชนิดขยะ: bottle, can, glass")
                print("   พิมพ์ 'done' เพื่อเสร็จสิ้น\n")

                while True:
                    cmd = input("  → หยอดขยะ: ").strip().lower()

                    if cmd == 'done':
                        break

                    # Map simple input to types
                    type_map = {
                        'bottle': 'CLEAR_BOTTLE',
                        'plastic': 'CLEAR_BOTTLE',
                        'opaque': 'OPAQUE_BOTTLE',
                        'glass': 'GLASSES_BOTTLE',
                        'steel': 'STEEL_CAN',
                        'can': 'ALUMINUM_CAN',
                        'aluminum': 'ALUMINUM_CAN',
                    }

                    item_type = type_map.get(cmd)
                    if not item_type:
                        print(f"    ❌ ไม่รู้จักประเภท '{cmd}'")
                        continue

                    # Simulate detection
                    from size.estimator import SizeEstimator
                    from scoring.calculator import ScoreCalculator

                    size_ml = SizeEstimator().get_size_ml(150)  # mock height
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
            self.detection.stop_camera()
            print("👋 ปิดระบบเรียบร้อย")


# ============================
# Entry Point
# ============================
if __name__ == "__main__":
    controller = SmartBinController()
    controller.start()
