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
                print(f"❌ [{self.name}] GPIO setup failed (TRIG={self.trig_pin}, ECHO={self.echo_pin}): {e}")
        else:
            logger.debug(f"[{self.name}] GPIO not available. Running in mock/simulation mode.")

    def measure_distance_cm(self, timeout_sec: float = 0.03) -> float | None:
        """
        วัดระยะทางจากเซนเซอร์เป็นเซนติเมตร
        - ยิง Pulse TRIG 10µs
        - ดักรอ ECHO กลับมาพร้อม Timeout เพื่อป้องกันระบบค้าง
        - ใช้ time.perf_counter() เพื่อความแม่นยำระดับ sub-microsecond
        - คืนค่าระยะทาง (cm) หรือ None หากเกิด timeout / อ่านค่าไม่ได้
        """
        if not GPIO_AVAILABLE or not self._initialized:
            logger.warning(f"[{self.name}] GPIO not available or sensor not initialized")
            return None

        try:
            # 1. รอให้ขา ECHO เคลียร์เป็น LOW ก่อน (ป้องกันคลื่นสะท้อนค้างจากรอบก่อน)
            wait_clear = time.perf_counter()
            while GPIO.input(self.echo_pin) == 1:
                if time.perf_counter() - wait_clear > 0.01:
                    logger.debug(f"[{self.name}] ECHO pin stuck HIGH before trigger")
                    return None

            # 2. ให้ TRIG เคลียร์สัญญาณ LOW สั้นๆ
            GPIO.output(self.trig_pin, False)
            time.sleep(0.000005)  # 5µs

            # 3. ส่ง Pulse 10µs ให้ TRIG
            GPIO.output(self.trig_pin, True)
            time.sleep(0.000010)  # 10µs
            GPIO.output(self.trig_pin, False)

            # 4. รอ ECHO เริ่มเปลี่ยนเป็น HIGH
            timeout_start = time.perf_counter()
            while GPIO.input(self.echo_pin) == 0:
                if time.perf_counter() - timeout_start > timeout_sec:
                    logger.debug(f"[{self.name}] Timeout waiting for ECHO HIGH")
                    return None
            pulse_start = time.perf_counter()

            # 5. รอ ECHO กลับเป็น LOW
            timeout_echo = time.perf_counter()
            while GPIO.input(self.echo_pin) == 1:
                if time.perf_counter() - timeout_echo > timeout_sec:
                    logger.debug(f"[{self.name}] Timeout waiting for ECHO LOW")
                    return None
            pulse_end = time.perf_counter()

            # 6. คำนวณระยะทาง (ความเร็วเสียง 343 m/s = 34,300 cm/s)
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

