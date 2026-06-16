# ============================
# SBAY Smart Bin - Session Manager
# จัดการ session ผู้ใช้: เก็บ items → สรุป → ส่ง
# ============================

import time
import logging
from datetime import datetime

logger = logging.getLogger("session")


class SessionManager:
    def __init__(self):
        self.reset()

    def reset(self):
        """ล้าง session ให้เริ่มใหม่"""
        self.device_id = None
        self.user_id = None
        self.user_name = None
        self.start_time = None
        self.items = []
        logger.info("Session reset")

    def start(self, device_id, user_id=None, user_name=None):
        """เริ่ม session ใหม่"""
        self.device_id = device_id
        self.user_id = user_id or ""
        self.user_name = user_name or "Guest"
        self.start_time = datetime.now().isoformat()
        self.items = []
        logger.info(f"Session started → user={self.user_name}, device={self.device_id}")

    def add_item(self, item_type, size_ml, weight=0.0, score=0.0):
        """เพิ่มรายการขยะเข้า session"""
        item = {
            "type": item_type,
            "size": self._classify_size(size_ml),
            "ml": size_ml,
            "weight": weight,
            "score": score,
            "timestamp": datetime.now().isoformat()
        }
        self.items.append(item)
        logger.info(f"Item added → {item_type} {size_ml}ml (score={score})")
        return item

    def get_summary(self):
        """สรุปจำนวนและปริมาตรรวม"""
        total_items = len(self.items)
        total_ml = sum(item["ml"] for item in self.items)
        total_score = sum(item.get("score", 0) for item in self.items)
        return {
            "totalItems": total_items,
            "totalMl": round(total_ml, 2),
            "totalScore": round(total_score, 2)
        }

    def to_payload(self):
        """แปลงเป็น JSON payload สำหรับส่งไป Backend"""
        summary = self.get_summary()
        return {
            "deviceId": self.device_id,
            "userId": self.user_id,
            "startTime": self.start_time,
            "endTime": datetime.now().isoformat(),
            "items": self.items,
            "totalItems": summary["totalItems"],
            "totalMl": summary["totalMl"]
        }

    def has_items(self):
        return len(self.items) > 0

    def _classify_size(self, ml):
        """จัดกลุ่มขนาด"""
        if ml <= 200:
            return "SMALL"
        elif ml <= 500:
            return "MEDIUM"
        elif ml <= 1000:
            return "LARGE"
        else:
            return "XLARGE"
