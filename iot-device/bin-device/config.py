# ============================
# SBAY Smart Bin - Configuration
# ============================

import os

# --- Device Identity ---
DEVICE_ID = os.getenv("DEVICE_ID", "BIN-001")

# --- Backend Server ---
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
API_BASE = f"{BACKEND_URL}/api"

# --- Mode ---
USE_HARDWARE = os.getenv("USE_HARDWARE", "false").lower() == "true"
USE_GUI = os.getenv("USE_GUI", "true").lower() == "true"

# --- Hardware Pins (Raspberry Pi BCM) ---
IR_PIN = 17
SERVO_SORT_PIN = 18
SERVO_RELEASE_PIN = 19

# --- AI Detection ---
MODEL_PATH = os.getenv("MODEL_PATH", "yolov8n.pt")
CONF_THRESHOLD = 0.7
STABLE_FRAMES = 5       # ต้อง detect ซ้ำกี่เฟรมถึงจะยืนยัน
COOLDOWN = 3             # วินาที ระหว่างการ detect แต่ละชิ้น
DETECT_TIMEOUT = 10      # วินาที ถ้า detect ไม่ได้ให้ timeout

# --- Size Estimation ---
K = 80  # ค่าคงที่คำนวณ Score

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