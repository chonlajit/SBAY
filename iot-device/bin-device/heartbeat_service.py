# ============================
# SBAY Smart Bin - Heartbeat Service
# ส่งสัญญาณ "ยังอยู่" ไป Backend ทุก N วินาที
# ============================

import threading
import time
import logging

from settings.config import HEARTBEAT_INTERVAL

logger = logging.getLogger("heartbeat")


class HeartbeatService:
    def __init__(self, api_client, device_id, on_status_change=None):
        self.api_client = api_client
        self.device_id = device_id
        self.interval = HEARTBEAT_INTERVAL
        self.running = False
        self._thread = None
        self.on_status_change = on_status_change
        self.last_ok = None

    def start(self):
        if not self.running:
            self.running = True
            self._thread = threading.Thread(target=self._run, daemon=True)
            self._thread.start()
            logger.info(f"Heartbeat started → every {self.interval}s")

    def stop(self):
        self.running = False
        logger.info("Heartbeat stopped")

    def _run(self):
        while self.running:
            ok, is_full = self.api_client.send_heartbeat(self.device_id)
            if ok:
                logger.debug(f"Heartbeat OK → {self.device_id} (isFull: {is_full})")
                if hasattr(self, 'on_full_status_change') and self.on_full_status_change:
                    self.on_full_status_change(is_full)
            else:
                logger.warning(f"Heartbeat FAIL → {self.device_id}")

            # แจ้งเตือนเมื่อสถานะการเชื่อมต่อเปลี่ยนไป (ล่ม หรือ กู้คืนสำเร็จ)
            if ok != self.last_ok:
                self.last_ok = ok
                if ok:
                    logger.info(f"🟢 Database & Backend connection RESTORED for {self.device_id}")
                else:
                    logger.warning(f"🔴 Database & Backend connection LOST for {self.device_id}")

                if self.on_status_change and callable(self.on_status_change):
                    try:
                        self.on_status_change(ok)
                    except Exception as e:
                        logger.error(f"Error in on_status_change callback: {e}")

            time.sleep(self.interval)
