# ============================
# SBAY Smart Bin - Configuration
# ============================

import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

# --- Device Identity ---
DEVICE_ID = os.getenv("DEVICE_ID", "BIN-001")
DEVICE_NAME = os.getenv("DEVICE_NAME", "Smart Bin")
DEVICE_LOCATION = os.getenv("DEVICE_LOCATION", "")

# --- Backend Server ---
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8070")
API_BASE = f"{BACKEND_URL}/api"
DEVICE_SECRET = os.getenv("DEVICE_SECRET")
if not DEVICE_SECRET:
    raise ValueError("CRITICAL ERROR: DEVICE_SECRET environment variable is not set!")

# --- Mode ---
USE_HARDWARE = str(os.getenv("USE_HARDWARE", "true")).strip().lower() == "true"
USE_CAMERA = str(os.getenv("USE_CAMERA", "true")).strip().lower() == "true"
USE_GUI = str(os.getenv("USE_GUI", "true")).strip().lower() == "true"
USE_IR = str(os.getenv("USE_IR", "true")).strip().lower() == "true"
USE_SERVO = os.getenv("USE_SERVO", "true").lower() == "true"

# --- Hardware Pins (Raspberry Pi BCM) ---
IR_PIN = 17
SERVO_SORT_PIN = 18
SERVO_RELEASE_PIN = 19
SERVO_DROP_PIN = 12
SERVO_RETURN_PIN = 13

# --- Servo Angles Configuration ---
# สามารถปรับแก้ตัวเลขเหล่านี้ได้ที่เดียวเพื่อให้มีผลกับระบบทั้งหมด
DEFAULT_SORT_ANGLE = int(os.getenv("DEFAULT_SORT_ANGLE", 260))
DEFAULT_RELEASE_ANGLE = int(os.getenv("DEFAULT_RELEASE_ANGLE", 82))
DROP_ANGLE_CLOSED = int(os.getenv("DROP_ANGLE_CLOSED", 90))
DROP_ANGLE_OPEN = int(os.getenv("DROP_ANGLE_OPEN", 0))
RETURN_ANGLE_CLOSED = int(os.getenv("RETURN_ANGLE_CLOSED", 90))
RETURN_ANGLE_OPEN = int(os.getenv("RETURN_ANGLE_OPEN", 0))

SORT_ANGLE_PLASTIC = int(os.getenv("SORT_ANGLE_PLASTIC", 260))
SORT_ANGLE_CAN = int(os.getenv("SORT_ANGLE_CAN", 200))
SORT_ANGLE_CARTON = int(os.getenv("SORT_ANGLE_CARTON", 320))

RELEASE_ANGLE_PLASTIC = int(os.getenv("RELEASE_ANGLE_PLASTIC", 104))
RELEASE_ANGLE_CAN = int(os.getenv("RELEASE_ANGLE_CAN", 60))
RELEASE_ANGLE_CARTON = int(os.getenv("RELEASE_ANGLE_CARTON", 60))

# --- Reset Buttons & LEDs (GPIO) ---
USE_RESET_BUTTONS = str(os.getenv("USE_RESET_BUTTONS", "true")).strip().lower() == "true"
RESET_PIN_PLASTIC = 22
RESET_PIN_CAN = 23
RESET_PIN_CARTON = 24
RESET_PIN_ALL = 25

# ไฟ LED แจ้งเตือนสถานะถังเต็ม
LED_BIN_FULL_PIN = 7

# --- AI Detection ---
MODEL_PATH = os.getenv("MODEL_PATH", "bottle-v1-3.pt")
CONF_THRESHOLD = 0.7
STABLE_FRAMES = 5       # ต้อง detect ซ้ำกี่เฟรมถึงจะยืนยัน
COOLDOWN = 3             # วินาที ระหว่างการ detect แต่ละชิ้น
DETECT_TIMEOUT = 10      # วินาที ถ้า detect ไม่ได้ให้ timeout

# --- Size Estimation ---
K = 80  # ค่าคงที่คำนวณ Score

# --- Camera & Size Estimation Calibration ---
USE_FOCAL = False
REF_WIDTH_CM = 5.6
REF_WIDTH_PX = 171
REF_HEIGHT_CM = 14.5
REF_HEIGHT_PX = 360
DISTANCE_CM = 40.0
FOCAL_LENGTH_PX = 1016  # (REF_WIDTH_PX * DISTANCE_CM) / REF_WIDTH_CM
CORRECTION_FACTOR = 0.98  # ปรับเป็น 1.00 เพื่อดึง 350ml ลงมาที่ 324ml
MIN_HEIGHT_PX = 100
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
OFFLINE_DB_PATH = "offline_queue.db"
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
    "BEVERAGE_CARTON": "กล่องเครื่องดื่ม"
}