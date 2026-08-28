# ============================
# SBAY Smart Bin - API Client
# รับส่งข้อมูลกับ Backend + Offline Queue (SQLite)
# ============================

import sqlite3
import json
import requests
import threading
import time
import logging

from config import API_BASE, OFFLINE_DB_PATH, RETRY_INTERVAL, DEVICE_SECRET, DEVICE_NAME, DEVICE_LOCATION

logger = logging.getLogger("api_client")


class ApiClient:
    def __init__(self):
        self.api_base = API_BASE
        self.db_path = OFFLINE_DB_PATH
        self._init_db()
        # Start retry thread
        self._retry_thread = threading.Thread(target=self._retry_loop, daemon=True)
        self._retry_thread.start()
        logger.info(f"ApiClient initialized → {self.api_base}")

    # ==============================
    # SQLite Offline Queue
    # ==============================
    def _init_db(self):
        """สร้าง Table สำหรับเก็บ Session ที่ส่งไม่สำเร็จ"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS failed_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payload TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        conn.commit()
        conn.close()

    def _save_to_queue(self, session_data):
        """บันทึก Session ลง SQLite เมื่อเน็ตล่ม"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("INSERT INTO failed_sessions (payload) VALUES (?)",
                  (json.dumps(session_data, default=str),))
        conn.commit()
        conn.close()
        logger.warning("Session saved to offline queue")

    def _retry_loop(self):
        """Background thread: ทยอยส่งข้อมูลที่ค้างใน SQLite"""
        while True:
            time.sleep(RETRY_INTERVAL)
            self._retry_failed_sessions()

    def _retry_failed_sessions(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT id, payload FROM failed_sessions ORDER BY created_at ASC")
        rows = c.fetchall()

        if rows:
            logger.info(f"Retrying {len(rows)} queued sessions...")

        for row in rows:
            record_id, payload_str = row
            try:
                session_data = json.loads(payload_str)
                response = requests.post(
                    f"{self.api_base}/sessions",
                    json=session_data,
                    headers={"X-Device-Secret": DEVICE_SECRET},
                    timeout=5
                )
                if response.status_code == 200:
                    c.execute("DELETE FROM failed_sessions WHERE id = ?", (record_id,))
                    conn.commit()
                    logger.info(f"Retried session {record_id} → OK")
                else:
                    logger.warning(f"Retry session {record_id} → HTTP {response.status_code}")
                    break
            except requests.RequestException:
                logger.warning("Retry failed → Network still down")
                break

        conn.close()

    def get_queued_count(self):
        """จำนวน Session ที่ค้างอยู่ใน offline queue"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM failed_sessions")
        count = c.fetchone()[0]
        conn.close()
        return count

    # ==============================
    # Backend API Calls
    # ==============================
    def get_user_by_phone(self, phone):
        """ค้นหาผู้ใช้จากเบอร์โทร"""
        try:
            resp = requests.get(
                f"{self.api_base}/sessions/user/{phone}",
                headers={"X-Device-Secret": DEVICE_SECRET},
                timeout=5
            )
            if resp.status_code == 200:
                return resp.json()
            return None
        except requests.RequestException as e:
            logger.error(f"get_user_by_phone error: {e}")
            return None

    def post_session(self, session_data):
        """ส่ง Session ไป Backend - ถ้าส่งไม่ได้ จะเก็บลง SQLite"""
        try:
            resp = requests.post(
                f"{self.api_base}/sessions",
                json=session_data,
                headers={"X-Device-Secret": DEVICE_SECRET},
                timeout=5
            )
            resp.raise_for_status()
            logger.info("Session sent successfully")
            return True
        except requests.RequestException as e:
            logger.error(f"post_session failed: {e}")
            self._save_to_queue(session_data)
            return False

    def send_heartbeat(self, device_id):
        """ส่ง heartbeat บอก Backend ว่าตู้ยัง online พร้อมข้อมูลชื่อและสถานที่"""
        try:
            payload = {
                "name": DEVICE_NAME,
                "location": DEVICE_LOCATION
            }
            resp = requests.post(
                f"{self.api_base}/devices/{device_id}/heartbeat",
                json=payload,
                headers={"X-Device-Secret": DEVICE_SECRET},
                timeout=3
            )
            resp.raise_for_status()
            
            # Check if backend reports this bin as FULL
            data = resp.json()
            is_full = data.get("isFull", False) if isinstance(data, dict) else False
            
            return True, is_full
        except requests.RequestException:
            return False, False

    def reset_bin(self, device_id, waste_type=None):
        """ส่งคำสั่งรีเซ็ตปริมาณขยะไปยัง Backend (เรียกผ่าน DeviceController API)"""
        try:
            payload = {}
            if waste_type:
                payload["type"] = waste_type
            else:
                payload["type"] = "ALL"
                
            resp = requests.post(
                f"{self.api_base}/devices/{device_id}/reset",
                json=payload,
                headers={"X-Device-Secret": DEVICE_SECRET},
                timeout=5
            )
            resp.raise_for_status()
            logger.info(f"Reset bin {device_id} for type {payload['type']} successfully")
            return True
        except requests.RequestException as e:
            logger.error(f"Failed to reset bin: {e}")
            return False
