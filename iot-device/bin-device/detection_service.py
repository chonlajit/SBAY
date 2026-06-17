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
    COOLDOWN, DETECT_TIMEOUT, USE_HARDWARE, USE_IR
)

logger = logging.getLogger("detection")

# Hardware imports (conditional)
if USE_HARDWARE:
    if USE_IR:
        from hardware.infrared import is_detected as ir_detected
    else:
        def ir_detected(): return True
    from hardware.servo import sort_item, release_item
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
        self.labels_buffer = deque(maxlen=STABLE_FRAMES)
        self.last_detection_time = 0

    def start_camera(self):
        """เปิดกล้อง"""
        if USE_HARDWARE:
            if not self.picam:
                try:
                    from picamera2 import Picamera2
                    self.picam = Picamera2()
                    cfg = self.picam.create_preview_configuration(main={"format": "BGR888", "size": (640, 480)})
                    self.picam.configure(cfg)
                    self.picam.start()
                    self.running = True
                    logger.info("PiCamera2 started")
                except ImportError:
                    logger.warning("Picamera2 not found, falling back to cv2")
                    self._start_cv2_camera()
            else:
                self.picam.start()
                self.running = True
        else:
            self._start_cv2_camera()

    def _start_cv2_camera(self):
        if self.cap is None or not self.cap.isOpened():
            self.cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
            self.running = True
            logger.info("Camera started")

    def stop_camera(self):
        """ปิดกล้อง"""
        self.running = False
        if self.picam:
            self.picam.stop()
        if self.cap:
            self.cap.release()
            self.cap = None
        cv2.destroyAllWindows()
        logger.info("Camera stopped")

    def reset_buffers(self):
        """ล้าง buffer สำหรับ detection ใหม่"""
        self.heights_buffer.clear()
        self.labels_buffer.clear()

    def detect_once(self):
        """
        อ่านเฟรมจากกล้อง + ทำ detection 1 รอบ
        """
        if self.picam and self.running:
            try:
                frame = self.picam.capture_array()
            except Exception as e:
                logger.warning(f"Picamera frame read failed: {e}")
                return None
        else:
            if not self.cap or not self.cap.isOpened():
                return None
            ret, frame = self.cap.read()
            if not ret:
                logger.warning("Camera frame read failed")
                return None

        current_time = time.time()

        # Cooldown check
        if current_time - self.last_detection_time < COOLDOWN:
            return None

        # Resize and define ROI
        frame = cv2.resize(frame, (320, 320))
        
        display_frame = frame.copy()
        cv2.rectangle(display_frame, (50, 100), (270, 300), (0, 255, 0), 2)
        self.latest_frame = display_frame

        roi = frame[100:300, 50:270]

        # Run YOLO detection
        detections = self.detector.detect(roi)

        if len(detections) == 0:
            self.reset_buffers()
            return None

        # Pick best detection
        best = max(detections, key=lambda x: x["confidence"])
        label = best["label"]
        height = best["height"]
        conf = best["confidence"]

        if conf < CONF_THRESHOLD:
            return None

        # Add to stability buffer
        self.heights_buffer.append(height)
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

        size_ml = self.size_estimator.get_size_ml(avg_height)
        result = self.calculator.calculate(stable_label, size_ml)

        # Hardware action
        sort_item(stable_label)
        time.sleep(0.3)
        release_item()

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
