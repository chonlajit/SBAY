# ============================
# SBAY Smart Bin - Configuration
# ============================

import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

# --- Device Identity ---
DEVICE_ID = os.getenv("DEVICE_ID", "BIN")
DEVICE_NAME = os.getenv("DEVICE_NAME", "SBAY Bin")
DEVICE_LOCATION = os.getenv("DEVICE_LOCATION", "")

# --- Backend Server ---
BACKEND_URL = os.getenv("BACKEND_URL", "https://sbay-platform.online")
API_BASE = f"{BACKEND_URL}/api"
DEVICE_SECRET = os.getenv("DEVICE_SECRET")
if not DEVICE_SECRET:
    raise ValueError("CRITICAL ERROR: DEVICE_SECRET environment variable is not set!")

# --- Mode ---
USE_HARDWARE = True
USE_CAMERA = True
USE_GUI = True
USE_IR = True
USE_SERVO = True
HIDE_CURSOR = True

# --- Hardware Pins (Raspberry Pi BCM) ---
IR_PIN = 17
SERVO_SORT_PIN = 18
SERVO_RELEASE_PIN = 19
SERVO_DROP_PIN = 12
SERVO_RETURN_PIN = 13

# --- Servo Angles Configuration ---
# สามารถปรับแก้ตัวเลขเหล่านี้ได้ที่เดียวเพื่อให้มีผลกับระบบทั้งหมด
DEFAULT_SORT_ANGLE = 265
DEFAULT_RELEASE_ANGLE = 82
DROP_ANGLE_CLOSED = 90
DROP_ANGLE_OPEN = 180

RETURN_ANGLE_CLOSED = 90
RETURN_ANGLE_OPEN = 180

SORT_ANGLE_PLASTIC = 265
SORT_ANGLE_CAN = 200
SORT_ANGLE_CARTON = 320
SORT_ANGLE_RETURN = 135

RELEASE_ANGLE_PLASTIC = 145
RELEASE_ANGLE_CAN = 55
RELEASE_ANGLE_CARTON = 55
RELEASE_ANGLE_RETURN = 55

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
    "PLASTIC_BOTTLE": {"empty_distance": 50.0, "full_distance": 10.0},
    "ALUMINUM_CAN": {"empty_distance": 50.0, "full_distance": 10.0},
    "BEVERAGE_CARTON": {"empty_distance": 50.0, "full_distance": 10.0},
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
CROP_BOTTOM_PCT = 0.70
CROP_LEFT_PCT = 0.26
CROP_RIGHT_PCT = 0.83

# --- Size Estimation ---
K = 80  # ค่าคงที่คำนวณ Score

# --- Camera & Size Estimation Calibration ---
USE_FOCAL = False
REF_WIDTH_CM = 5.6
REF_WIDTH_PX = 171
REF_HEIGHT_CM = 14.5
REF_HEIGHT_PX = 360
DISTANCE_CM = 34.0  # ระยะห่างจากกล้องถึงพื้นวางขวด (เดิม 40.0cm)
FOCAL_LENGTH_PX = int((REF_WIDTH_PX * DISTANCE_CM) / REF_WIDTH_CM)  # คำนวณจากระยะ 34cm (~1038)
CORRECTION_FACTOR = 0.98  # ปรับเป็น 1.00 เพื่อดึง 350ml ลงมาที่ 324ml
MIN_HEIGHT_PX = 100
SERVO_HOLD_ON_DROP = True  # เกร็งสู้แรงกระแทกเมื่อมีขวดตกใส่แผ่นรอง

ML_RANGES = [
    # (min_ml, max_ml, label_ml)
    (0, 190, 180),
    (190, 225, 200),
    (225, 275, 250),
    (275, 312, 300),
    (312, 360, 325),
    (360, 470, 450),
    (470, 495, 490),
    (495, 550, 500),
    (550, 615, 600),
    (615, 715, 630),   # 620-640 -> ใช้ค่ากลาง 630 เพื่อให้คำนวณคะแนนได้
    (715, 900, 800),
    (900, 1250, 1000),
    (1250, 9999, 1500)
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