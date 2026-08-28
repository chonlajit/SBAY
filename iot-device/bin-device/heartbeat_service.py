# ============================
# SBAY Smart Bin - Heartbeat Service
# ส่งสัญญาณ "ยังอยู่" ไป Backend ทุก N วินาที
# ============================

import threading
import time
import logging

from config import HEARTBEAT_INTERVAL

logger = logging.getLogger("heartbeat")


class HeartbeatService:
    def __init__(self, api_client, device_id):
        self.api_client = api_client
        self.device_id = device_id
        self.interval = HEARTBEAT_INTERVAL
        self.running = False
        self._thread = None

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
                if hasattr(self, 'on_full_status_change'):
                    self.on_full_status_change(is_full)
            else:
                logger.warning(f"Heartbeat FAIL → {self.device_id}")
            time.sleep(self.interval)
