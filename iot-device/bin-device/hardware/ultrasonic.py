# ============================
# SBAY Smart Bin - Ultrasonic Hardware Driver
# ไดรเวอร์อ่านระยะทางสำหรับเซนเซอร์อัลตร้าโซนิค HC-SR04
# ============================

import time
import logging

logger = logging.getLogger("ultrasonic_hw")

# ตรวจสอบการรองรับ GPIO บนบอร์ด Raspberry Pi
GPIO_AVAILABLE = False
try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    GPIO_AVAILABLE = False


class UltrasonicSensor:
    """
    ไดรเวอร์ควบคุมเซนเซอร์ HC-SR04 ตัวเดี่ยว
    ขา ECHO ต่อผ่าน Voltage Divider (1kΩ/2kΩ) ลดแรงดัน 5V เหลือ ~3.3V เข้าพิน GPIO
    """
    def __init__(self, trig_pin: int, echo_pin: int, name: str = "Ultrasonic"):
        self.trig_pin = trig_pin
        self.echo_pin = echo_pin
        self.name = name
        self._initialized = False

        if GPIO_AVAILABLE:
            try:
                GPIO.setup(self.trig_pin, GPIO.OUT)
                GPIO.setup(self.echo_pin, GPIO.IN)
                GPIO.output(self.trig_pin, False)
                self._initialized = True
                logger.info(f"[{self.name}] Initialized on TRIG={self.trig_pin}, ECHO={self.echo_pin}")
            except Exception as e:
                logger.error(f"[{self.name}] GPIO setup failed: {e}")
        else:
            logger.debug(f"[{self.name}] GPIO not available. Running in mock/simulation mode.")

    def measure_distance_cm(self, timeout_sec: float = 0.03) -> float | None:
        """
        วัดระยะทางจากเซนเซอร์เป็นเซนติเมตร
        - ยิง Pulse TRIG 10µs
        - ดักรอ ECHO กลับมาพร้อม Timeout เพื่อป้องกันระบบค้าง
        - คืนค่าระยะทาง (cm) หรือ None หากเกิด timeout / อ่านค่าไม่ได้
        """
        if not GPIO_AVAILABLE or not self._initialized:
            # Simulation fallback
            return 35.0

        try:
            # 1. ให้ TRIG เคลียร์สัญญาณ LOW สั้นๆ
            GPIO.output(self.trig_pin, False)
            time.sleep(0.000002)  # 2µs

            # 2. ส่ง Pulse 10µs ให้ TRIG
            GPIO.output(self.trig_pin, True)
            time.sleep(0.000010)  # 10µs
            GPIO.output(self.trig_pin, False)

            # 3. รอ ECHO เริ่มเป็น HIGH (พร้อม timeout)
            start_wait = time.time()
            pulse_start = start_wait
            while GPIO.input(self.echo_pin) == 0:
                pulse_start = time.time()
                if pulse_start - start_wait > timeout_sec:
                    logger.debug(f"[{self.name}] Timeout waiting for ECHO HIGH")
                    return None

            # 4. รอ ECHO กลับเป็น LOW (พร้อม timeout)
            pulse_end = pulse_start
            while GPIO.input(self.echo_pin) == 1:
                pulse_end = time.time()
                if pulse_end - pulse_start > timeout_sec:
                    logger.debug(f"[{self.name}] Timeout waiting for ECHO LOW")
                    return None

            # 5. คำนวณระยะทาง
            pulse_duration = pulse_end - pulse_start
            distance = (pulse_duration * 34300.0) / 2.0

            # ตรวจสอบขอบเขตระยะที่เป็นไปได้ของ HC-SR04 (2 cm - 400 cm)
            if 2.0 <= distance <= 400.0:
                return round(distance, 2)
            else:
                logger.debug(f"[{self.name}] Out of range reading: {distance:.1f} cm")
                return None

        except Exception as e:
            logger.warning(f"[{self.name}] Measurement error: {e}")
            return None

    # Alias for convenience
    read_distance = measure_distance_cm

    def cleanup(self):
        """คืนทรัพยากร GPIO"""
        if GPIO_AVAILABLE and self._initialized:
            try:
                GPIO.cleanup((self.trig_pin, self.echo_pin))
            except Exception:
                pass


class MockUltrasonicSensor:
    """Mock sensor สำหรับการทดสอบ Unit Test / Integration Test"""
    def __init__(self, trig_pin: int, echo_pin: int, name: str = "MockUltrasonic"):
        self.trig_pin = trig_pin
        self.echo_pin = echo_pin
        self.name = name
        self.simulated_distance = 35.0
        self.fail_mode = False

    def measure_distance_cm(self, timeout_sec: float = 0.03) -> float | None:
        if self.fail_mode:
            return None
        return self.simulated_distance

    def set_distance(self, dist: float | None):
        self.simulated_distance = dist

    read_distance = measure_distance_cm

    def cleanup(self):
        pass

