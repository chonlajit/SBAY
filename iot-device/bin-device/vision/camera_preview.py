# ========================================================
# SBAY Smart Bin - Live Camera Preview & Stream Service
# รองรับ Picamera2, USB WebCam (OpenCV) และ Simulation Mode
# พร้อม HUD Overlay สำหรับ Test Servo และ Calibration
# ========================================================

import cv2
import numpy as np
import threading
import time
import os
import sys
import logging

# เพิ่ม Path ให้มองเห็น config
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(root_dir, 'bin-device'))
sys.path.insert(0, root_dir)

try:
    from settings.config import (
        CAMERA_ROTATION,
        CROP_TOP_PCT, CROP_BOTTOM_PCT, CROP_LEFT_PCT, CROP_RIGHT_PCT
    )
except ImportError:
    CAMERA_ROTATION = 270
    CROP_TOP_PCT = 0.23
    CROP_BOTTOM_PCT = 0.70
    CROP_LEFT_PCT = 0.26
    CROP_RIGHT_PCT = 0.83

logger = logging.getLogger("camera_preview")


class CameraStream:
    """
    คลาสจัดการกล้องแบบเบื้องหลัง (Background Thread)
    ดึงภาพสดตลอดเวลาเพื่อไม่ให้เฟรมค้าง และแปลงภาพตาม CAMERA_ROTATION
    """
    def __init__(self, width=640, height=480):
        self.width = width
        self.height = height
        self.picam = None
        self.cap = None
        self.camera_type = "None"
        self.is_simulated = False
        self.latest_frame = None
        self.running = False
        self.thread = None
        self.fps = 0.0
        self._frame_count = 0
        self._fps_time = time.time()
        self._init_camera()

    def _init_camera(self):
        """พยายามเปิด Picamera2 ก่อน -> ถ้าไม่ได้ลอง cv2.VideoCapture -> ถ้าไม่ได้ใช้ Simulation"""
        # 1. พยายามใช้ Picamera2 (สำหรับ Raspberry Pi)
        try:
            from picamera2 import Picamera2
            self.picam = Picamera2()
            # เช็คว่ามีกล้องเชื่อมต่ออยู่จริงหรือไม่
            cams = self.picam.global_camera_info()
            if len(cams) > 0:
                cfg = self.picam.create_preview_configuration(
                    main={"format": "BGR888", "size": (self.width, self.height)}
                )
                self.picam.configure(cfg)
                self.picam.start()
                time.sleep(1.0)
                self.camera_type = "Picamera2 (CSI)"
                logger.info(f"✅ เปิดกล้องสำเร็จ: {self.camera_type}")
                return
            else:
                self.picam = None
        except Exception as e:
            self.picam = None
            logger.debug(f"Picamera2 not available: {e}")

        # 2. พยายามใช้ cv2.VideoCapture (USB Webcam / OpenCV)
        try:
            if os.name == 'nt':
                self.cap = cv2.VideoCapture(0)
            else:
                self.cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
                
            if self.cap is not None and self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    self.camera_type = "WebCam (OpenCV)"
                    logger.info(f"✅ เปิดกล้องสำเร็จ: {self.camera_type}")
                    return
                else:
                    self.cap.release()
                    self.cap = None
        except Exception as e:
            self.cap = None
            logger.debug(f"OpenCV VideoCapture not available: {e}")

        # 3. หากไม่มีกล้องใดๆ ให้ใช้โหมดจำลอง (Simulation)
        self.is_simulated = True
        self.camera_type = "Simulation (No Camera)"
        logger.warning("⚠️ ไม่พบฮาร์ดแวร์กล้อง เปิดใช้งานโหมดจำลองภาพ (Simulation Mode)")

    def start(self):
        """เริ่มเธรดดึงภาพสด"""
        if self.running:
            return self
        self.running = True
        self.thread = threading.Thread(target=self._update_loop, daemon=True)
        self.thread.start()
        return self

    def _update_loop(self):
        anim_offset = 0
        while self.running:
            raw_frame = None

            if self.picam is not None:
                try:
                    raw_frame = self.picam.capture_array()
                except Exception:
                    raw_frame = None

            elif self.cap is not None and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret:
                    raw_frame = frame

            if raw_frame is None:
                # สร้างภาพจำลองที่มีอนิเมชันบอกว่าระบบยังทำงานอยู่
                raw_frame = self._generate_simulated_frame(anim_offset)
                anim_offset = (anim_offset + 3) % 480
                time.sleep(0.033)
            else:
                # ปรับการหมุนตาม CAMERA_ROTATION
                raw_frame = self._rotate_frame(raw_frame)

            self.latest_frame = raw_frame
            self._update_fps()

    def _rotate_frame(self, frame):
        if CAMERA_ROTATION == 90:
            return cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        elif CAMERA_ROTATION == 180:
            return cv2.rotate(frame, cv2.ROTATE_180)
        elif CAMERA_ROTATION == 270:
            return cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
        return frame

    def _generate_simulated_frame(self, offset):
        """สร้างภาพจำลองพื้นหลังสีเข้มสวยงามเมื่อไม่มีกล้อง"""
        h, w = self.height, self.width
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        
        # วาดพื้นหลังสไลด์เกรเดียนท์
        frame[:, :] = (25, 20, 18)
        
        # เส้นสแกนจำลอง
        cv2.line(frame, (0, offset), (w, offset), (60, 180, 75), 1)
        
        # ข้อความแจ้งเตือนกลางจอ
        cv2.putText(frame, "SIMULATED CAMERA STREAM", (w//2 - 160, h//2 - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (120, 120, 120), 2)
        cv2.putText(frame, "[No Hardware Camera Detected]", (w//2 - 150, h//2 + 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 165, 255), 1)
        cv2.putText(frame, "Servo controls are fully active!", (w//2 - 140, h//2 + 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 220, 100), 1)
        return frame

    def _update_fps(self):
        self._frame_count += 1
        elapsed = time.time() - self._fps_time
        if elapsed >= 1.0:
            self.fps = self._frame_count / elapsed
            self._frame_count = 0
            self._fps_time = time.time()

    def get_frame(self):
        """คืนค่าภาพล่าสุดพร้อมนำไปใช้งาน"""
        if self.latest_frame is not None:
            return self.latest_frame.copy()
        blank = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        return blank

    def stop(self):
        """หยุดการทำงานและคืนค่ากล้อง"""
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)

        if self.picam:
            try:
                self.picam.stop()
            except Exception:
                pass
            self.picam = None

        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        logger.info("Camera stream stopped")


def draw_hud(frame, title="SBAY CAMERA VIEW",
             menu_text="[1] Plastic  [2] Can  [3] Carton  [4] Return",
             status_text="Ready", action_text="",
             current_servo=None, current_angle=None,
             camera_type="CSI", fps=0.0,
             show_crosshair=False, show_crop=False):
    """
    วาดส่วนแสดงผล HUD Overlay บนภาพ:
    - แถบเมนูด้านบน (Title, FPS, Shortcut guide)
    - แถบสถานะด้านล่าง (Current Action, Status)
    - รายละเอียดองศา Servo (สำหรับการ Calibrate)
    - เส้นกากบาทเล็งตำแหน่ง หรือกรอบ Crop
    """
    h, w = frame.shape[:2]
    overlay = frame.copy()

    # 1. แถบ Header ด้านบน (พื้นหลังโปร่งใสสีดำ)
    cv2.rectangle(overlay, (0, 0), (w, 52), (15, 23, 42), -1)
    
    # 2. แถบ Footer ด้านล่าง
    cv2.rectangle(overlay, (0, h - 45), (w, h), (15, 23, 42), -1)

    # ผสมเลเยอร์โปร่งแสง 75%
    alpha = 0.75
    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

    # ข้อมูลบน Header
    cv2.putText(frame, title, (12, 22),
                cv2.FONT_HERSHEY_DUPLEX, 0.55, (255, 255, 255), 1)
    
    cam_info = f"{camera_type} | {fps:.1f} FPS"
    cv2.putText(frame, cam_info, (w - 180, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 220, 255), 1)

    # แถบเมนูปุ่มกด
    cv2.putText(frame, menu_text, (12, 42),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 230, 255), 1)

    # ข้อมูลบน Footer
    if action_text:
        # ข้อความ Action กำลังทำงาน (สีเขียวสว่าง)
        cv2.putText(frame, f">> {action_text}", (12, h - 18),
                    cv2.FONT_HERSHEY_DUPLEX, 0.55, (50, 255, 120), 1)
    else:
        # สถานะทั่วไป
        cv2.putText(frame, f"Status: {status_text}", (12, h - 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

    # ถ้ามีข้อมูลการ Calibrate (Servo Name + Angle)
    if current_servo is not None and current_angle is not None:
        calib_text = f"TARGET: {current_servo} @ {current_angle:.1f} deg"
        cv2.putText(frame, calib_text, (w - 270, h - 18),
                    cv2.FONT_HERSHEY_DUPLEX, 0.5, (0, 215, 255), 1)

    # วาด Crosshair เส้นเล็งกึ่งกลาง
    if show_crosshair:
        cx, cy = w // 2, h // 2
        cv2.line(frame, (cx - 25, cy), (cx + 25, cy), (0, 255, 255), 1)
        cv2.line(frame, (cx, cy - 25), (cx, cy + 25), (0, 255, 255), 1)
        cv2.circle(frame, (cx, cy), 15, (0, 255, 255), 1)

    # วาดกรอบ Crop Area ตาม config
    if show_crop:
        x1 = int(w * CROP_LEFT_PCT)
        y1 = int(h * CROP_TOP_PCT)
        x2 = int(w * CROP_RIGHT_PCT)
        y2 = int(h * CROP_BOTTOM_PCT)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, "CROP ZONE", (x1 + 6, y1 + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)

    return frame


class LiveCameraWindow:
    """
    คลาสเปิดหน้าต่าง OpenCV แสดงภาพกล้องแบบ Background Thread
    ทำให้โปรแกรมที่มีการบล็อก input() ใน Terminal (เช่น calibrate_servo)
    ยังคงแสดงภาพสดจากกล้องที่ลื่นไหล 30 FPS ได้อย่างต่อเนื่องโดยไม่ค้าง
    """
    def __init__(self, window_name="SBAY Camera View", width=640, height=480,
                 title="SBAY CAMERA FEED", menu_text="",
                 show_crosshair=False, show_crop=False):
        self.window_name = window_name
        self.stream = CameraStream(width=width, height=height)
        self.title = title
        self.menu_text = menu_text
        self.status_text = "Standby"
        self.action_text = ""
        self.current_servo = None
        self.current_angle = None
        self.show_crosshair = show_crosshair
        self.show_crop = show_crop
        self.running = False
        self.thread = None
        self.last_key = -1

    def start(self):
        """เริ่มเปิดกล้องและหน้าต่างแสดงผล"""
        self.stream.start()
        self.running = True
        self.thread = threading.Thread(target=self._window_loop, daemon=True)
        self.thread.start()
        return self

    def set_action(self, text, duration=2.5):
        """ตั้งค่าข้อความ Action และรีเซ็ตอัตโนมัติเมื่อครบเวลา"""
        self.action_text = text
        def _clear():
            time.sleep(duration)
            if self.action_text == text:
                self.action_text = ""
        threading.Thread(target=_clear, daemon=True).start()

    def set_status(self, text):
        self.status_text = text

    def set_calibration_info(self, servo_name, angle):
        self.current_servo = servo_name
        self.current_angle = angle

    def _window_loop(self):
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, self.stream.width, self.stream.height)

        while self.running:
            frame = self.stream.get_frame()
            hud_frame = draw_hud(
                frame=frame,
                title=self.title,
                menu_text=self.menu_text,
                status_text=self.status_text,
                action_text=self.action_text,
                current_servo=self.current_servo,
                current_angle=self.current_angle,
                camera_type=self.stream.camera_type,
                fps=self.stream.fps,
                show_crosshair=self.show_crosshair,
                show_crop=self.show_crop
            )
            cv2.imshow(self.window_name, hud_frame)
            key = cv2.waitKey(30)
            if key != -1:
                self.last_key = key

        try:
            cv2.destroyWindow(self.window_name)
        except Exception:
            pass

    def get_key(self):
        k = self.last_key
        self.last_key = -1
        return k

    def stop(self):
        """ปิดหน้าต่างและหยุดกล้อง"""
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        self.stream.stop()
