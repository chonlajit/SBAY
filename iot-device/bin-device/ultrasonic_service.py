# ============================
# SBAY Smart Bin - Ultrasonic Service
# ตรวจวัดระดับความเต็มของถังขยะ 3 ช่องแบบ Real-time (Sequential)
# พร้อมตัวกรองสัญญาณรบกวน (Noise Filter) และส่งข้อมูลไป Backend
# ============================

import threading
import time
import logging
from collections import deque
from typing import Dict, Optional, Tuple

from settings.config import (
    USE_HARDWARE,
    ULTRASONIC_PINS,
    ULTRASONIC_CALIBRATION,
    FILL_THRESHOLD_WARNING,
    FILL_THRESHOLD_FULL,
    ULTRASONIC_SENSOR_DELAY_MS,
    ULTRASONIC_CYCLE_INTERVAL_SEC,
    ULTRASONIC_UPDATE_THRESHOLD_PCT,
    ULTRASONIC_FILTER_WINDOW,
)

logger = logging.getLogger("ultrasonic")


class UltrasonicService:
    """
    บริการตรวจวัดระดับความเต็มของถังขยะทั้ง 3 ช่อง:
    - PLASTIC_BOTTLE
    - ALUMINUM_CAN
    - BEVERAGE_CARTON
    """

    COMPARTMENTS = ["PLASTIC_BOTTLE", "ALUMINUM_CAN", "BEVERAGE_CARTON"]

    def __init__(self, api_client=None, device_id: str = "BIN", sensor_factory=None):
        self.api_client = api_client
        self.device_id = device_id
        self.running = False
        self._thread = None
        self._lock = threading.Lock()

        # Calibration และ Configuration
        self.calibration = ULTRASONIC_CALIBRATION
        self.warning_threshold = FILL_THRESHOLD_WARNING
        self.full_threshold = FILL_THRESHOLD_FULL
        self.sensor_delay = ULTRASONIC_SENSOR_DELAY_MS / 1000.0
        self.cycle_interval = ULTRASONIC_CYCLE_INTERVAL_SEC
        self.update_threshold = ULTRASONIC_UPDATE_THRESHOLD_PCT
        self.filter_window = ULTRASONIC_FILTER_WINDOW

        # Data buffers สำหรับ Noise filtering (Rolling Window)
        self._history: Dict[str, deque] = {
            c: deque(maxlen=self.filter_window) for c in self.COMPARTMENTS
        }

        # สถานะล่าสุดที่ผ่านการคำนวณแล้ว (Thread-safe state)
        self._waste_levels: Dict[str, float] = {c: 0.0 for c in self.COMPARTMENTS}
        self._raw_distances: Dict[str, Optional[float]] = {c: None for c in self.COMPARTMENTS}
        self._statuses: Dict[str, str] = {c: "NORMAL" for c in self.COMPARTMENTS}
        self._is_full: bool = False
        self._full_waste_type: Optional[str] = None

        # บันทึกสถานะล่าสุดที่ส่งไป Backend เพื่อเปรียบเทียบ
        self._last_sent_levels: Dict[str, float] = {c: -999.0 for c in self.COMPARTMENTS}
        self._last_sent_is_full: Optional[bool] = None
        self._last_sent_time: float = 0.0

        # เริ่มต้นเซนเซอร์ฮาร์ดแวร์
        self.sensors = {}
        self._init_sensors(sensor_factory)

    def _init_sensors(self, sensor_factory=None):
        """กำหนดและสร้าง Sensor Object สำหรับแต่ละ Compartment"""
        from hardware.ultrasonic import UltrasonicSensor, MockUltrasonicSensor

        for comp in self.COMPARTMENTS:
            pins = ULTRASONIC_PINS.get(comp, {})
            trig = pins.get("trig")
            echo = pins.get("echo")

            if sensor_factory:
                self.sensors[comp] = sensor_factory(trig, echo, comp)
            elif USE_HARDWARE:
                self.sensors[comp] = UltrasonicSensor(trig, echo, name=comp)
            else:
                self.sensors[comp] = MockUltrasonicSensor(trig, echo, name=comp)

    def start(self):
        """เริ่ม Background Thread วนอ่านค่าเซนเซอร์"""
        if not self.running:
            self.running = True
            self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self._thread.start()
            logger.info("Ultrasonic monitoring service started (Sequential mode)")

    def stop(self):
        """หยุด Service และ Cleanup เซนเซอร์"""
        self.running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

        for sensor in self.sensors.values():
            if hasattr(sensor, 'cleanup'):
                sensor.cleanup()
        logger.info("Ultrasonic monitoring service stopped")

    def read_cycle(self):
        """อ่านค่าเซนเซอร์ทุกช่อง 1 รอบแบบ Sequential พร้อมประเมินสถานะ"""
        for comp in self.COMPARTMENTS:
            if not self.running and self._thread:
                break

            sensor = self.sensors.get(comp)
            if sensor:
                dist = sensor.measure_distance_cm(timeout_sec=0.03)
                self._process_reading(comp, dist)

            time.sleep(self.sensor_delay)

        self._evaluate_and_sync()

    def _monitor_loop(self):
        """Loop หลัก: อ่านค่าทีละตัวแบบ Sequential แล้วคำนวณความเต็ม"""
        while self.running:
            try:
                self.read_cycle()
            except Exception as e:
                logger.error(f"Error in ultrasonic monitor loop: {e}", exc_info=True)

            time.sleep(max(0.1, self.cycle_interval))

    def _process_reading(self, compartment: str, raw_distance: Optional[float]):
        """ประมวลผลค่าที่อ่านได้ และกรอง Noise ด้วย Median Filter"""
        with self._lock:
            self._raw_distances[compartment] = raw_distance

            if raw_distance is not None and raw_distance > 0:
                self._history[compartment].append(raw_distance)
            else:
                logger.debug(f"[{compartment}] Invalid or timeout reading")

            history = list(self._history[compartment])
            if history:
                sorted_history = sorted(history)
                mid = len(sorted_history) // 2
                filtered_distance = sorted_history[mid]
            else:
                cal = self.calibration.get(compartment, {"empty_distance": 50.0, "full_distance": 10.0})
                filtered_distance = cal.get("empty_distance", 50.0)

            fill_pct = self._calculate_percentage(compartment, filtered_distance)
            self._waste_levels[compartment] = fill_pct

            if fill_pct >= self.full_threshold:
                status = "FULL"
            elif fill_pct >= self.warning_threshold:
                status = "WARNING"
            else:
                status = "NORMAL"

            self._statuses[compartment] = status

            full_types = [c for c in self.COMPARTMENTS if self._statuses[c] == "FULL"]
            self._is_full = len(full_types) > 0
            self._full_waste_type = full_types[0] if full_types else None

    def _calculate_percentage(self, compartment: str, current_distance: float) -> float:
        """
        แปลงระยะทาง (cm) เป็นเปอร์เซ็นต์ความเต็ม (0-100%)
        สูตร: ((empty - current) / (empty - full)) * 100
        """
        cal = self.calibration.get(compartment, {"empty_distance": 50.0, "full_distance": 10.0})
        empty_dist = float(cal.get("empty_distance", 50.0))
        full_dist = float(cal.get("full_distance", 10.0))

        if empty_dist <= full_dist:
            return 0.0

        raw_pct = ((empty_dist - current_distance) / (empty_dist - full_dist)) * 100.0
        clamped_pct = max(0.0, min(100.0, raw_pct))
        return round(clamped_pct, 1)

    def _evaluate_and_sync(self):
        """สรุปสถานะรวมของตู้ และส่งอัปเดตไปที่ Backend หากมีการเปลี่ยนแปลง"""
        with self._lock:
            full_types = [c for c in self.COMPARTMENTS if self._statuses[c] == "FULL"]
            self._is_full = len(full_types) > 0
            self._full_waste_type = full_types[0] if full_types else None

            current_levels = dict(self._waste_levels)
            current_is_full = self._is_full
            current_full_type = self._full_waste_type
            statuses = dict(self._statuses)

        log_msg = " | ".join(
            f"{c.split('_')[0].capitalize()}: {current_levels[c]}% ({statuses[c]})"
            for c in self.COMPARTMENTS
        )

        should_send = False
        now = time.time()

        for c in self.COMPARTMENTS:
            if abs(current_levels[c] - self._last_sent_levels.get(c, -999.0)) >= self.update_threshold:
                should_send = True
                break

        if current_is_full != self._last_sent_is_full:
            should_send = True

        # Sync เป็นระยะทุก 60 วินาทีถ้าไม่มีการเปลี่ยนแปลง เพื่อประหยัด CPU/Network
        if now - self._last_sent_time > 60.0:
            should_send = True

        if should_send:
            logger.info(f"[ULTRASONIC] {log_msg}")
        else:
            logger.debug(f"[ULTRASONIC] {log_msg}")

        if current_is_full:
            for ft in full_types:
                logger.warning(f"[FULL] {ft} compartment is full")

        if should_send and self.api_client:
            self._send_to_backend(current_levels, current_is_full, current_full_type)

    def _send_to_backend(self, levels: Dict[str, float], is_full: bool, full_type: Optional[str]):
        """ยิงข้อมูลไปยัง Backend API (Non-blocking / Thread-safe)"""
        max_capacities = {c: 100.0 for c in self.COMPARTMENTS}
        
        # ลองส่งทั้ง update_waste_levels (แบบ 3 ช่อง) หรือ send_fill_level ตามที่ api_client มี
        success = False
        if hasattr(self.api_client, 'update_waste_levels'):
            success = self.api_client.update_waste_levels(
                device_id=self.device_id,
                waste_levels=levels,
                max_capacities=max_capacities,
                is_full=is_full,
                full_waste_type=full_type
            )
        elif hasattr(self.api_client, 'send_fill_level'):
            # Fallback หากใช้ฟังก์ชันเดี่ยว (ส่งค่าสูงสุดของทั้ง 3 ช่อง)
            max_level = max(levels.values()) if levels else 0.0
            success = self.api_client.send_fill_level(self.device_id, max_level)

        if success:
            self._last_sent_levels = dict(levels)
            self._last_sent_is_full = is_full
            self._last_sent_time = time.time()
            logger.debug("Waste levels synced to backend successfully")

    # ==============================
    # Public Query Methods (สำหรับ Main Controller)
    # ==============================

    def is_compartment_full(self, waste_type: str) -> bool:
        """ตรวจสอบว่าช่องประเภทที่ระบุเต็มหรือไม่ (True = FULL)"""
        with self._lock:
            alias_map = {
                "CLEAR_BOTTLE": "PLASTIC_BOTTLE",
                "OPAQUE_BOTTLE": "PLASTIC_BOTTLE",
                "BOTTLE": "PLASTIC_BOTTLE",
                "CAN": "ALUMINUM_CAN",
                "CANNED": "ALUMINUM_CAN",
                "CARTON": "BEVERAGE_CARTON",
                "MILK": "BEVERAGE_CARTON",
            }
            canonical = alias_map.get(waste_type.upper(), waste_type.upper())
            status = self._statuses.get(canonical, "NORMAL")
            return status == "FULL"

    def get_waste_levels(self) -> Dict[str, float]:
        """คืนค่าระดับความเต็ม (%) ของแต่ละช่อง"""
        with self._lock:
            return dict(self._waste_levels)

    def get_status(self, waste_type: str) -> str:
        """คืนค่าสถานะ ('NORMAL', 'WARNING', 'FULL') ของช่องที่ระบุ"""
        with self._lock:
            return self._statuses.get(waste_type.upper(), "NORMAL")

    def get_full_info(self) -> Tuple[bool, Optional[str]]:
        """คืนค่า (is_full, full_waste_type) ของตู้โดยรวม"""
        with self._lock:
            return self._is_full, self._full_waste_type
