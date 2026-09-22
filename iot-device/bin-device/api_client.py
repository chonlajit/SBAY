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
import os
from datetime import datetime

from settings.config import API_BASE, OFFLINE_DB_PATH, RETRY_INTERVAL, DEVICE_SECRET, DEVICE_NAME, DEVICE_LOCATION

logger = logging.getLogger("api_client")


class ApiClient:
    def __init__(self):
        self.api_base = API_BASE
        self.db_path = OFFLINE_DB_PATH
        self.is_connected = True
        self.last_status = "OK"
        self.last_error = None
        self._init_session()
        self._init_db()
        # Start retry thread
        self._retry_thread = threading.Thread(target=self._retry_loop, daemon=True)
        self._retry_thread.start()
        logger.info(f"ApiClient initialized with auto-reconnect session → {self.api_base}")

    def _init_session(self):
        """สร้าง requests.Session พร้อม Connection Pool และ Retry Adapter เพื่อ Auto-reconnect อัตโนมัติเมื่อฐานข้อมูลกลับมา"""
        from urllib3.util import Retry
        from requests.adapters import HTTPAdapter

        self.session = requests.Session()
        retries = Retry(
            total=3,
            connect=3,
            read=3,
            backoff_factor=0.3,
            status_forcelist=[500, 502, 503, 504],
            raise_on_status=False
        )
        adapter = HTTPAdapter(max_retries=retries, pool_connections=5, pool_maxsize=10)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    # ==============================
    # SQLite Offline Queue
    # ==============================
    def _init_db(self):
        """สร้าง Table สำหรับเก็บ Session ที่ส่งไม่สำเร็จ"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
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
                response = self.session.post(
                    f"{self.api_base}/sessions",
                    json=session_data,
                    headers={"X-Device-Secret": DEVICE_SECRET},
                    timeout=5
                )
                if response.status_code == 200:
                    c.execute("DELETE FROM failed_sessions WHERE id = ?", (record_id,))
                    conn.commit()
                    logger.info(f"Retried session {record_id} → OK")
                    self.is_connected = True
                else:
                    logger.warning(f"Retry session {record_id} → HTTP {response.status_code}")
                    break
            except requests.RequestException:
                logger.warning("Retry failed → Network still down")
                self.is_connected = False
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
    def get_user_by_phone(self, phone, return_status=False, retries=2):
        """
        ค้นหาผู้ใช้จากเบอร์โทร พร้อมระบบ Auto-reconnect อัตโนมัติหากฐานข้อมูลกำลังกู้คืน
        Returns:
            user_data (dict or None) เมื่อ return_status=False
            (user_data, status) เมื่อ return_status=True โดย status คือ 'OK' | 'NOT_FOUND' | 'DB_ERROR'
        """
        last_error = None
        user_result = None
        status_result = "DB_ERROR"

        for attempt in range(1, retries + 1):
            try:
                resp = self.session.get(
                    f"{self.api_base}/sessions/user/{phone}",
                    headers={"X-Device-Secret": DEVICE_SECRET},
                    timeout=4
                )
                if resp.status_code == 200:
                    self.is_connected = True
                    self.last_status = "OK"
                    self.last_error = None
                    user_result = resp.json()
                    status_result = "OK"
                    break
                elif resp.status_code == 404:
                    self.is_connected = True
                    self.last_status = "NOT_FOUND"
                    self.last_error = None
                    logger.info(f"User not found for phone {phone} (HTTP 404)")
                    user_result = None
                    status_result = "NOT_FOUND"
                    break
                else:
                    logger.warning(f"get_user_by_phone HTTP {resp.status_code} (attempt {attempt}/{retries})")
                    last_error = f"HTTP {resp.status_code}"
            except requests.RequestException as e:
                logger.warning(f"get_user_by_phone connection error (attempt {attempt}/{retries}): {e}")
                last_error = str(e)
                self.is_connected = False

            if attempt < retries:
                time.sleep(0.8)

        if status_result == "DB_ERROR":
            self.last_status = "DB_ERROR"
            self.last_error = last_error
            self.is_connected = False
            logger.error(f"get_user_by_phone failed after {retries} attempts: {last_error}")

        if return_status:
            return user_result, status_result
        return user_result

    def post_session(self, session_data):
        """ส่ง Session ไป Backend - ถ้าส่งไม่ได้ จะเก็บลง SQLite"""
        try:
            resp = self.session.post(
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
            resp = self.session.post(
                f"{self.api_base}/devices/{device_id}/heartbeat",
                json=payload,
                headers={"X-Device-Secret": DEVICE_SECRET},
                timeout=3
            )
            resp.raise_for_status()
            self.is_connected = True

            # Check if backend reports this bin as FULL
            data = resp.json()
            is_full = data.get("isFull", False) if isinstance(data, dict) else False

            return True, is_full
        except requests.RequestException:
            self.is_connected = False
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

    def send_fill_level(self, device_id, fill_level, timestamp=None):
        """ส่งข้อมูล Fill Level (0-100%) จาก Ultrasonic Sensor ไปยัง Backend"""
        try:
            clamped_level = max(0, min(100, int(round(fill_level))))
            payload = {
                "machineId": device_id,
                "fillLevel": clamped_level,
                "timestamp": timestamp or datetime.now().isoformat()
            }
            resp = requests.post(
                f"{self.api_base}/devices/fill-level",
                json=payload,
                headers={"X-Device-Secret": DEVICE_SECRET},
                timeout=5
            )
            resp.raise_for_status()
            logger.info(f"Fill level sent successfully: {device_id} -> {clamped_level}%")
            return True
        except requests.RequestException as e:
            logger.error(f"Failed to send fill level: {e}")
            return False

    def update_waste_levels(self, device_id, waste_levels, max_capacities=None, is_full=False, full_waste_type=None):
        """
        ส่งข้อมูลระดับความเต็มของถังขยะทั้ง 3 ช่องไปยัง Backend
        Endpoint: POST /api/devices/{deviceId}/level
        Data structure สอดคล้องกับ DeviceController.java และ Front-end (Admin Dashboard)
        """
        try:
            if max_capacities is None:
                max_capacities = {
                    "PLASTIC_BOTTLE": 100.0,
                    "ALUMINUM_CAN": 100.0,
                    "BEVERAGE_CARTON": 100.0
                }

            payload = {
                "wasteLevels": waste_levels,
                "maxCapacities": max_capacities,
                "isFull": bool(is_full),
                "fullWasteType": full_waste_type
            }

            resp = requests.post(
                f"{self.api_base}/devices/{device_id}/level",
                json=payload,
                headers={"X-Device-Secret": DEVICE_SECRET},
                timeout=3
            )
            resp.raise_for_status()
            logger.debug(f"Successfully updated waste levels for {device_id}")
            return True
        except requests.RequestException as e:
            logger.warning(f"Failed to update waste levels: {e}")
            return False


