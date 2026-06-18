# ============================
# SBAY Smart Bin - Configuration
# ============================

import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

# --- Device Identity ---
DEVICE_ID = os.getenv("DEVICE_ID", "BIN-001")

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
REF_WIDTH_CM = 6.5
REF_WIDTH_PX = 130
DISTANCE_CM = 30.0
FOCAL_LENGTH_PX = 600.0  # (REF_WIDTH_PX * DISTANCE_CM) / REF_WIDTH_CM
CORRECTION_FACTOR = 0.85
MIN_HEIGHT_PX = 100
ML_RANGES = [
    # (min_ml, max_ml, label_ml)
    (0, 190, 180),
    (190, 225, 200),
    (225, 275, 250),
    (275, 312, 300),
    (312, 327, 325),
    (327, 340, 330),
    (340, 400, 350),
    (400, 470, 450),
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
    "CLEAR_BOTTLE": 10,
    "OPAQUE_BOTTLE": 3,
    "GLASSES_BOTTLE": 0.5,
    "STEEL_CAN": 2,
    "ALUMINUM_CAN": 40
}

GRAM_PER_ML = {
    "CLEAR_BOTTLE": 0.033,
    "OPAQUE_BOTTLE": 0.08,
    "GLASSES_BOTTLE": 0.4,
    "STEEL_CAN": 0.17,
    "ALUMINUM_CAN": 0.033
}

SCORE_PER_GRAM = {
    "CLEAR_BOTTLE": 0.8,
    "OPAQUE_BOTTLE": 0.24,
    "GLASSES_BOTTLE": 0.04,
    "STEEL_CAN": 0.16,
    "ALUMINUM_CAN": 3.2
}

# --- Waste Type Labels (Thai) ---
WASTE_LABELS = {
    "CLEAR_BOTTLE": "ขวดพลาสติกใส",
    "OPAQUE_BOTTLE": "ขวดพลาสติกขุ่น",
    "GLASSES_BOTTLE": "ขวดแก้ว",
    "STEEL_CAN": "กระป๋องเหล็ก",
    "ALUMINUM_CAN": "กระป๋องอลูมิเนียม"
}