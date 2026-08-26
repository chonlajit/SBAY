# ============================
# SBAY Smart Bin - Detection Service
# รวม YOLO + Size Estimation + Score เข้าด้วยกัน
# ============================

import cv2
import time
import logging
from collections import deque

from vision.detector import Detector
from size.estimator import SizeEstimator
from scoring.calculator import ScoreCalculator
from config import (
    MODEL_PATH, CONF_THRESHOLD, STABLE_FRAMES,
    COOLDOWN, DETECT_TIMEOUT, USE_HARDWARE, USE_IR, USE_SERVO, USE_CAMERA
)

logger = logging.getLogger("detection")

# Hardware imports (conditional)
if USE_HARDWARE:
    if USE_IR:
        from hardware.infrared import is_detected as ir_detected
    else:
        def ir_detected(): return True
        
    if USE_SERVO:
        from hardware.servo import sort_item, release_item
    else:
        def sort_item(label): logger.debug(f"[SIMULATE] sort → {label}")
        def release_item(): logger.debug("[SIMULATE] release")
else:
    def ir_detected():
        return True
    def sort_item(label):
        logger.debug(f"[SIMULATE] sort → {label}")
    def release_item():
        logger.debug("[SIMULATE] release")


class DetectionService:
    """
    จัดการกล้อง + AI Detection + Size Estimation
    ทำงานร่วมกับ SessionManager (เพิ่มรายการขยะ)
    """

    def __init__(self):
        self.detector = Detector(MODEL_PATH)
        self.size_estimator = SizeEstimator()
        self.calculator = ScoreCalculator()
        self.cap = None
        self.picam = None
        self.running = False
        self.latest_frame = None

        # Stability buffers
        self.heights_buffer = deque(maxlen=STABLE_FRAMES)
        self.widths_buffer = deque(maxlen=STABLE_FRAMES)
        self.labels_buffer = deque(maxlen=STABLE_FRAMES)
        self.last_detection_time = 0

    def start_camera(self):
        """เปิดกล้อง"""
        if USE_CAMERA:
            if not self.picam:
                logger.info("Starting Picamera2...")
                from picamera2 import Picamera2
                self.picam = Picamera2()
                cfg = self.picam.create_preview_configuration(main={"format": "BGR888", "size": (3280, 2464)})
                self.picam.configure(cfg)
                self.picam.start()
                import time as _t
                _t.sleep(2)  # Pi Camera needs warmup
                self.running = True
                logger.info("PiCamera2 started successfully")
            else:
                self.picam.start()
                self.running = True
        else:
            self._start_cv2_camera()

    def _start_cv2_camera(self):
        if self.cap is None or not self.cap.isOpened():
            import os
            if os.name == 'nt':
                self.cap = cv2.VideoCapture(0)
            else:
                self.cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
                
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            # Warm up cv2 camera
            for _ in range(5):
                self.cap.read()
                
            logger.info("Camera started (cv2)")

    def stop_camera(self):
        """ปิดกล้อง"""
        self.running = False
        if self.picam:
            try:
                self.picam.stop()
            except Exception as e:
                logger.error(f"Error stopping Picamera2: {e}")
        
        if self.cap and self.cap.isOpened():
            self.cap.release()
            
        logger.info("Camera stopped")

    def reset_buffers(self):
        """ล้าง buffer สำหรับ detection ใหม่"""
        self.heights_buffer.clear()
        self.widths_buffer.clear()
        self.labels_buffer.clear()

    def detect_once(self):
        """อ่านภาพ 1 เฟรมและส่งเข้า YOLO (ถ้าพ้น Cooldown)"""


        frame = None
        if self.picam and self.running:
            try:
                frame = self.picam.capture_array()
                # สลับสี RGB/BGR เพราะกล้องส่งสีมาสลับกัน (สีแดงกลายเป็นฟ้า)
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            except Exception as e:
                logger.warning(f"Picamera frame read failed: {e}")
                return None, 0
        else:
            if not self.cap or not self.cap.isOpened():
                return None, 0
            ret, frame = self.cap.read()
            if not ret:
                logger.warning("Camera frame read failed")
                return None, 0

        # นำการตัดขอบ (Crop) ออก เพื่อให้กล้องใช้ความกว้างจริงทั้งหมดตามที่ต้องการ
        # frame = frame[:, 140:500]
        # 3. อัปเดตเฟรมล่าสุดสำหรับ GUI (ทำทุกรอบ ไม่ว่าจะ cooldown หรือไม่)
        display_frame = frame.copy()
        self.latest_frame = display_frame

        # 4. Cooldown check
        current_time = time.time()
        if current_time - self.last_detection_time < COOLDOWN:
            return None
        # 5. รัน YOLO บนภาพเต็ม (ให้มันวาดกรอบสวยๆ ให้เลย)
        detections, annotated_frame = self.detector.detect(frame)
        self.latest_frame = annotated_frame

        if len(detections) == 0:
            self.reset_buffers()
            return None

        # Pick best detection
        best = max(detections, key=lambda x: x["confidence"])
        
        # แปลงชื่อคลาสจาก AI ให้ตรงกับที่ระบบตั้งไว้ (เผื่อใช้โมเดลคนละเวอร์ชัน)
        label_map = {
            "CLEAR_BOTTLE": "PLASTIC_BOTTLE",
            "BOTTLE": "PLASTIC_BOTTLE",
            "PLASTIC_BOTTLE": "PLASTIC_BOTTLE",
            "CAN": "ALUMINUM_CAN",
            "ALUMINUM_CAN": "ALUMINUM_CAN",
            "CARTON": "BEVERAGE_CARTON",
            "BEVERAGE_CARTON": "BEVERAGE_CARTON"
        }
        raw_label = best["label"].upper()
        label = label_map.get(raw_label, raw_label)
        
        height = best["height"]
        conf = best["confidence"]

        if conf < CONF_THRESHOLD:
            return None

        # Add to stability buffer
        self.heights_buffer.append(height)
        self.widths_buffer.append(best["width"])
        self.labels_buffer.append(label)

        # Need enough consecutive stable frames
        if len(self.heights_buffer) < STABLE_FRAMES:
            return None

        # All labels must match
        if len(set(self.labels_buffer)) != 1:
            return None

        # ✅ STABLE DETECTION CONFIRMED
        stable_label = self.labels_buffer[-1]
        avg_height = sum(self.heights_buffer) / len(self.heights_buffer)
        avg_width = sum(self.widths_buffer) / len(self.widths_buffer)

        raw_size_ml = self.size_estimator.get_size_ml(avg_width, avg_height)
        # ปรับค่าให้เป็นขอบล่างของช่วง (Lower bound) เพื่อใช้คิดคะแนน
        size_ml = raw_size_ml - (raw_size_ml % 10)

        result = self.calculator.calculate(stable_label, size_ml)

        # Hardware action
        sort_item(stable_label)
        time.sleep(0.3)
        release_item(stable_label)

        # Reset buffers for next item
        self.reset_buffers()
        self.last_detection_time = current_time

        logger.info(f"DETECTED: {stable_label} → {size_ml}ml, score={result['score']}")

        return {
            "type": stable_label,
            "size_ml": size_ml,
            "weight": result["weight"],
            "score": result["score"]
        }

    def is_item_present(self):
        """ตรวจว่ามีวัตถุอยู่หน้า IR sensor หรือไม่"""
        return ir_detected()
