#!/usr/bin/env python3
# ==========================================
# SBAY Smart Bin - Test Full Return Flow
# ทดสอบ Flow เมื่อถังเต็ม แล้ว AI ตรวจจับได้ว่าขยะประเภทนั้นเต็ม
# ระบบต้องสั่งคืนขวด (Return) และให้ 0 คะแนน โดยไม่ตัด Session
# ==========================================

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(root_dir, 'bin-device'))
sys.path.insert(0, root_dir)

# Mock environment
os.environ["DEVICE_SECRET"] = "test_mock_secret"
os.environ["USE_HARDWARE"] = "false"

from hardware.ultrasonic import MockUltrasonicSensor
from ultrasonic_service import UltrasonicService
from detection_service import DetectionService
from session_manager import SessionManager


class TestFullReturnFlow(unittest.TestCase):

    def setUp(self):
        self.api_client = MagicMock()
        self.session = SessionManager()
        self.session.start("BIN_TEST", "USER_1", "Test User")

    def test_ultrasonic_detects_full_and_returns_item(self):
        # 1. จำลอง Ultrasonic Service โดยมีเซนเซอร์พลาสติกเต็มถัง (ระยะ 8cm < full_distance 10cm)
        def mock_factory(trig, echo, name):
            sensor = MockUltrasonicSensor(trig, echo, name)
            if name == "PLASTIC_BOTTLE":
                sensor.set_distance(8.0)   # เต็ม (> 90%)
            else:
                sensor.set_distance(45.0)  # โล่ง (~12%)
            return sensor

        service = UltrasonicService(
            api_client=self.api_client,
            device_id="BIN_TEST",
            sensor_factory=mock_factory
        )

        # ให้อ่านค่า 1 รอบ
        service.read_cycle()

        # ตรวจสอบว่าระบบมองว่าช่อง PLASTIC_BOTTLE เต็มจริง
        self.assertTrue(service.is_compartment_full("PLASTIC_BOTTLE"))
        self.assertFalse(service.is_compartment_full("ALUMINUM_CAN"))

        # 2. จำลอง Detection Service เมื่อตรวจเจอ PLASTIC_BOTTLE
        import numpy as np
        detection = DetectionService()
        detection.cap = MagicMock()
        detection.cap.isOpened.return_value = True
        detection.cap.read.return_value = (True, np.zeros((480, 640, 3), dtype=np.uint8))
        detection.last_detection_time = 0

        # Mock detector ให้ตรวจเจอขวดพลาสติกเสถียร
        detection.detector.detect = MagicMock(return_value=(
            [{"label": "PLASTIC_BOTTLE", "confidence": 0.95, "width": 60, "height": 200}],
            np.zeros((480, 640, 3), dtype=np.uint8)
        ))

        # จำลองการเรียก detect_once 5 รอบจนกระทั่งเสถียร
        result = None
        for _ in range(5):
            res = detection.detect_once(check_full_callback=service.is_compartment_full)
            if res:
                result = res
                break

        # ตรวจสอบผลลัพธ์: ต้องคืนของ และคะแนนเป็น 0
        self.assertIsNotNone(result, "Detection should have confirmed stable detection")
        self.assertTrue(result.get("returned"), "Item must be returned when compartment is full")
        self.assertEqual(result.get("score"), 0, "Score must be 0 for returned item")

        # ตรวจสอบ Session: ถ้า returned ต้องไม่ถูกบันทึกคะแนนเข้า session
        if not result.get("returned"):
            self.session.add_item(result["type"], result["size_ml"], result["weight"], result["score"])

        summary = self.session.get_summary()
        self.assertEqual(summary["totalItems"], 0, "No item should be added to user summary")
        self.assertEqual(summary["totalScore"], 0, "Total score should be 0")

        service.stop()


if __name__ == "__main__":
    unittest.main()
