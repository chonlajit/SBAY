# ============================
# SBAY Smart Bin - Configuration
# ============================

import os
import sys



# Load variables from .env file (ค้นหาทั้งใน settings/, root ของ iot-device, และ CWD)
_config_dir = os.path.dirname(os.path.abspath(__file__))
_env_candidates = [
    os.path.join(_config_dir, ".env"),
    os.path.join(os.path.dirname(_config_dir), ".env"),
    os.path.join(os.getcwd(), ".env"),
]

try:
    from dotenv import load_dotenv
    for _path in _env_candidates:
        if os.path.isfile(_path):
            load_dotenv(_path, override=False)
    load_dotenv()
except ImportError:
    # Fallback parser กรณีที่เครื่องยังไม่ได้ติดตั้ง python-dotenv
    for _path in _env_candidates:
        if os.path.isfile(_path):
            try:
                with open(_path, "r", encoding="utf-8") as _f:
                    for _line in _f:
                        _line = _line.strip()
                        if _line and not _line.startswith("#") and "=" in _line:
                            _k, _v = _line.split("=", 1)
                            _k = _k.strip()
                            _v = _v.strip().strip("'\"")
                            if _k not in os.environ:
                                os.environ[_k] = _v
            except Exception:
                pass


# ============================================================
# 1. ข้อมูลสำคัญ & ความปลอดภัย (ดึงจากไฟล์ .env เป็นหลัก เพื่อความปลอดภัย)
# ============================================================
DEVICE_SECRET = os.getenv("DEVICE_SECRET")
if not DEVICE_SECRET:
    raise ValueError("CRITICAL ERROR: กรุณาระบุ DEVICE_SECRET ในไฟล์ .env !")

DEVICE_ID = os.getenv("DEVICE_ID", "BIN-001")
DEVICE_NAME = os.getenv("DEVICE_NAME", "SBAY Bin")
DEVICE_LOCATION = os.getenv("DEVICE_LOCATION", "")

BACKEND_URL = os.getenv("BACKEND_URL", "https://sbay-platform.online")
API_BASE = f"{BACKEND_URL}/api"


# ============================================================
# 2. การตั้งค่าเครื่อง & ฮาร์ดแวร์ (ปรับแก้ที่ไฟล์นี้โดยตรง ไม่ต้องใส่ใน .env)
# ============================================================

# --- Mode & Hardware Control (เปิด/ปิดระบบตรงนี้ได้ทันที) ---
USE_HARDWARE = True if sys.platform.startswith("linux") else False
USE_CAMERA = True
USE_GUI = True
GUI_FULLSCREEN = True if sys.platform.startswith("linux") else False
USE_IR = True    # ตั้งค่าเซ็นเซอร์ IR ตรงนี้ (True = เปิด, False = ปิด)
USE_SERVO = True # ตั้งค่าเซอร์โวมอเตอร์ตรงนี้ (True = เปิด, False = ปิด)
HIDE_CURSOR = True

# --- GUI Engine Type ---
# 'tkinter' = Classic Desktop GUI (หน้าจอหลักเดิม ปรับแต่งแก้ค้างแล้ว)
# 'web' = Web Kiosk (Chromium + FastAPI)
GUI_TYPE = "tkinter"
WEB_KIOSK_PORT = 8000

# --- Hardware Pins (Raspberry Pi BCM) ---
IR_PIN = 17
SERVO_SORT_PIN = 18
SERVO_RELEASE_PIN = 19
SERVO_DROP_PIN = 12
SERVO_RETURN_PIN = 13

# --- Servo Angles Configuration ---
DEFAULT_SORT_ANGLE = 265
DEFAULT_RELEASE_ANGLE = 82
DROP_ANGLE_CLOSED = 180
DROP_ANGLE_OPEN = 80

RETURN_ANGLE_CLOSED = 180
RETURN_ANGLE_OPEN = 9

# ควบคุมการสั่งรีเซ็ต Servo 180 องศา (Drop / Return) ตอนเปิดระบบ
# ค่าเริ่มต้นเป็น False เพื่อป้องกันไม่ให้มอเตอร์สะบัด/หมุนจนสุดตอนรัน main_controller
RESET_180_SERVOS_ON_STARTUP = False

SORT_ANGLE_PLASTIC = 265
SORT_ANGLE_CAN = 200
SORT_ANGLE_CARTON = 320
SORT_ANGLE_RETURN = 135

RELEASE_ANGLE_PLASTIC = 145
RELEASE_ANGLE_CAN = 55
RELEASE_ANGLE_CARTON = 55
RELEASE_ANGLE_RETURN = 60
# --- Ultrasonic Sensors (GPIO BCM) ---
# Compartments: Plastic, Can, Carton
# Circuit Note: ECHO pins connect through 1k/2k voltage dividers (5V -> 3.3V safe for Pi)
ULTRASONIC_TRIG_PLASTIC = 22
ULTRASONIC_ECHO_PLASTIC = 23

ULTRASONIC_TRIG_CAN = 24
ULTRASONIC_ECHO_CAN = 25

ULTRASONIC_TRIG_CARTON = 26
ULTRASONIC_ECHO_CARTON = 20

# PCB FP3 Pin - Spare GPIO (ห้ามนำไปใช้งานโดยไม่มีเหตุผล)
SPARE_FP3_PIN = 8

ULTRASONIC_PINS = {
    "PLASTIC_BOTTLE": {"trig": ULTRASONIC_TRIG_PLASTIC, "echo": ULTRASONIC_ECHO_PLASTIC},
    "ALUMINUM_CAN": {"trig": ULTRASONIC_TRIG_CAN, "echo": ULTRASONIC_ECHO_CAN},
    "BEVERAGE_CARTON": {"trig": ULTRASONIC_TRIG_CARTON, "echo": ULTRASONIC_ECHO_CARTON},
}

# --- Ultrasonic Calibration (Distance in cm) ---
# ปรับแต่งระยะถังเปล่า (empty) และระยะถังเต็ม (full) แยกตามประเภท
# หมายเหตุ: ค่าเริ่มต้นเป็น placeholder ต้องทำการ calibrate วัดระยะหน้างานจริงหลังติดตั้ง
ULTRASONIC_CALIBRATION = {
    "PLASTIC_BOTTLE": {"empty_distance": 70.7, "full_distance": 10.0},
    "ALUMINUM_CAN": {"empty_distance": 44, "full_distance": 10.0},
    "BEVERAGE_CARTON": {"empty_distance": 44, "full_distance": 10.0},
}

# --- Fill Status Thresholds (%) ---
FILL_THRESHOLD_WARNING = 70.0
FILL_THRESHOLD_FULL = 90.0

# --- Ultrasonic Timing & Stability ---
ULTRASONIC_SENSOR_DELAY_MS = 60       # หน่วงเวลาระหว่างยิงแต่ละตัว (ms) ป้องกัน cross-talk
ULTRASONIC_CYCLE_INTERVAL_SEC = 2.0   # ความถี่วนรอบอ่านค่าทั้ง 3 ตัว (วินาที)
ULTRASONIC_UPDATE_THRESHOLD_PCT = 2.0 # ส่งข้อมูลไป Backend เมื่อระดับขยะเปลี่ยนเกินกี่ %
ULTRASONIC_FILTER_WINDOW = 5          # จำนวนค่า reading ที่ใช้ทำ rolling median filter

# ไฟ LED แจ้งเตือนสถานะถังเต็ม
LED_BIN_FULL_PIN = 7

# --- AI Detection ---
# โมเดลตรวจจับขยะ (ใช้โมเดลใหม่ v7: runs/detect/v7/best.pt)
_base_dir = os.path.dirname(os.path.dirname(__file__))
_root_dir = os.path.dirname(_base_dir)
_candidate_models = [
    os.path.join(_base_dir, "bin-device", "runs", "detect", "v7", "best.pt"),
    os.path.join(_base_dir, "bin-device", "runs", "detect", "v7", "best (4).pt"),
    os.path.join(_root_dir, "runs", "detect", "v7", "best.pt"),
    os.path.join(_root_dir, "runs", "detect", "v7", "best (4).pt"),
    os.path.join(_base_dir, "bin-device", "bottle-v6", "weights", "best.pt"),
]

MODEL_PATH = _candidate_models[0]
for _candidate in _candidate_models:
    if os.path.exists(_candidate):
        MODEL_PATH = _candidate
        break
CONF_THRESHOLD = 0.5
STABLE_FRAMES = 5       # ต้อง detect ซ้ำกี่เฟรมถึงจะยืนยัน
COOLDOWN = 3             # วินาที ระหว่างการ detect แต่ละชิ้น
DETECT_TIMEOUT = 10      # วินาที ถ้า detect ไม่ได้ให้ timeout

# --- AI Detection Crop Area & Camera ---
CAMERA_ROTATION = 270
USE_ROTATED_BBOX = True   # ปรับกรอบ Bounding Box ให้เอียงตามรูปทรงขวดจริง
CROP_TOP_PCT = 0.23
CROP_BOTTOM_PCT = 0.75
CROP_LEFT_PCT = 0.29
CROP_RIGHT_PCT = 0.93

# --- Size Estimation ---
K = 80  # ค่าคงที่คำนวณ Score

# --- Camera & Size Estimation Calibration ---
USE_FOCAL = False

REF_SMALL_W_CM = 5.25
REF_SMALL_W_PX = 103
REF_SMALL_H_CM = 10
REF_SMALL_H_PX = 210

REF_LARGE_W_CM = 8.5
REF_LARGE_W_PX = 195
REF_LARGE_H_CM = 33.0
REF_LARGE_H_PX = 600

REF_WIDTH_CM = REF_SMALL_W_CM
REF_WIDTH_PX = REF_SMALL_W_PX
REF_HEIGHT_CM = REF_SMALL_H_CM
REF_HEIGHT_PX = REF_SMALL_H_PX

DISTANCE_CM = 34.0  # ระยะห่างจากกล้องถึงพื้นวางขวด (เดิม 40.0cm)
FOCAL_LENGTH_PX = int((REF_WIDTH_PX * DISTANCE_CM) / REF_WIDTH_CM) if REF_WIDTH_CM else 1038
CORRECTION_FACTOR = 1.00  # ปรับเป็น 1.00 ให้ตรงตามทรงจริงของขวดที่ตัดเงาออกแล้ว
MIN_HEIGHT_PX = 100
SERVO_HOLD_ON_DROP = True  # เกร็งสู้แรงกระแทกเมื่อมีขวดตกใส่แผ่นรอง

ML_RANGES = [
    # (min_ml, max_ml, label_ml)
    (0, 230, 170),      # กระป๋องกาแฟ 170ml / กล่องนมเล็ก
    (230, 280, 250),    # กระป๋อง 240-250ml
    (280, 320, 300),    # 300ml
    (320, 410, 325),    # กระป๋องน้ำอัดลม 325ml / 330ml
    (410, 470, 350),    # ขวดน้ำดื่มมินิ / ชาเขียวมินิ 350ml
    (470, 550, 500),    # ขวดชาเขียวโออิชิ/อิชิตัน 500ml, น้ำอัดลม 450-500ml
    (550, 800, 600),    # ขวดน้ำดื่มมาตรฐาน 550ml - 600ml (คริสตัล, ช้าง, สิงห์, เนสท์เล่)
    (800, 950, 800),    # ขวดชาเขียวใหญ่ 800ml
    (950, 1250, 1000),  # ขวด 1 ลิตร
    (1250, 9999, 1500)  # ขวดลิตรใหญ่ 1.5L
]

# --- Heartbeat ---
HEARTBEAT_INTERVAL = 30  # วินาที

# --- Offline Queue ---
OFFLINE_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "offline_queue.db")
RETRY_INTERVAL = 30      # วินาที

# --- Price & Scoring ---
PRICE_PER_KG = {
    "PLASTIC_BOTTLE": 10,
    "ALUMINUM_CAN": 40,
    "BEVERAGE_CARTON": 9
}

GRAM_PER_ML = {
    "PLASTIC_BOTTLE": 0.033,
    "ALUMINUM_CAN": 0.033,
    "BEVERAGE_CARTON": 0.05
}

SCORE_PER_GRAM = {
    "PLASTIC_BOTTLE": 0.8,
    "ALUMINUM_CAN": 3.2,
    "BEVERAGE_CARTON": 0.72
}

# --- Waste Type Labels (Thai) ---
WASTE_LABELS = {
    "PLASTIC_BOTTLE": "ขวดพลาสติก",
    "ALUMINUM_CAN": "กระป๋องอลูมิเนียม",
    "BEVERAGE_CARTON": "กล่องเครื่องดื่ม",
    "RETURN": "คืนขวด"
}

# --- GUI Inactivity Timeouts (Seconds) ---
# หากเปิดหน้าจอทิ้งไว้แล้วไม่มีการใช้งาน จะกลับสู่หน้าหลับ (Sleep Screen) อัตโนมัติ
GUI_IDLE_TIMEOUT_PHONE = 30       # หน้ากรอกเบอร์โทร (30 วินาที)
GUI_IDLE_TIMEOUT_DETECTING = 45   # หน้าหยอดขยะ (45 วินาที)
GUI_IDLE_TIMEOUT_HISTORY = 30     # หน้าประวัติ (30 วินาที)
GUI_IDLE_TIMEOUT_RESULT = 6       # หน้าสรุปผลคะแนน (6 วินาที)
