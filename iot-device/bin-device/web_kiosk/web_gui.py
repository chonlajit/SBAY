import os
import sys
import time
import base64
import asyncio
import logging
import threading
import subprocess
import uvicorn
from typing import Optional

try:
    import cv2
except ImportError:
    cv2 = None

from .server import app, manager

logger = logging.getLogger("web_gui")


class SmartBinWebGUI:
    """
    Web Kiosk Adapter for SBAY Smart Bin.
    Replaces Tkinter SmartBinGUI with a high-performance, GPU-accelerated
    Web Kiosk running on Chromium in full-screen kiosk mode.
    """

    def __init__(self, on_phone_submit=None, on_finish=None, get_waste_levels=None, port=8000):
        self.on_phone_submit = on_phone_submit
        self.on_finish = on_finish
        self.get_waste_levels = get_waste_levels
        self.port = port
        self.server_thread = None
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.running = False
        self._last_cam_time = 0.0

        # Wire up incoming WebSocket actions to controller callbacks
        manager.controller_callback = self._handle_client_action

        # Initial waste levels
        if self.get_waste_levels and callable(self.get_waste_levels):
            try:
                live = self.get_waste_levels()
                if live:
                    manager.latest_state["waste_levels"] = live
            except Exception:
                pass

    def _handle_client_action(self, payload: dict):
        action = payload.get("action")
        if action == "submit_phone":
            phone = payload.get("phone", "")
            if self.on_phone_submit:
                self.on_phone_submit(phone)
        elif action == "guest_mode":
            if self.on_phone_submit:
                self.on_phone_submit("")
        elif action == "finish":
            if self.on_finish:
                self.on_finish()
        elif action == "close_alert":
            if hasattr(self, '_alert_on_close') and callable(self._alert_on_close):
                cb = self._alert_on_close
                self._alert_on_close = None
                cb()
        elif action == "tap_to_wake":
            logger.info("Client tapped screen to wake")
        elif action == "get_status":
            if self.get_waste_levels and callable(self.get_waste_levels):
                try:
                    live = self.get_waste_levels()
                    if live:
                        self.set_waste_levels(live)
                except Exception:
                    pass

    def _broadcast_event(self, event_data: dict):
        if not self.loop or not self.loop.is_running():
            return
        asyncio.run_coroutine_threadsafe(manager.broadcast(event_data), self.loop)

    def schedule(self, func, *args):
        """Invoke controller callbacks safely"""
        try:
            func(*args)
        except Exception as e:
            logger.error(f"Error in schedule callback: {e}")

    def show_idle(self):
        self._broadcast_event({"event": "show_idle"})

    def show_phone_input(self):
        self._broadcast_event({"event": "show_phone"})

    def show_alert(self, title: str, message: str, button_text: str = "ตกลง", on_close=None, alert_type: str = "warning"):
        self._alert_on_close = on_close
        self._broadcast_event({
            "event": "show_alert",
            "title": title,
            "message": message,
            "button_text": button_text,
            "type": alert_type
        })

    def set_phone_checking(self, is_checking: bool = True):
        self._broadcast_event({
            "event": "phone_checking",
            "checking": is_checking
        })

    def save_phone_history(self, phone: str):
        pass

    def show_welcome(self, name: str, alert_message: Optional[str] = None):
        self._broadcast_event({
            "event": "show_welcome",
            "name": name,
            "alert": alert_message
        })

    def show_detecting(self):
        self._broadcast_event({"event": "show_detecting"})

    def add_detected_item(self, item_type: str, size_ml: float, score: float):
        self._broadcast_event({
            "event": "item_detected",
            "type": item_type,
            "size_ml": size_ml,
            "score": score
        })

    def update_status(self, message: str, color: Optional[str] = None):
        self._broadcast_event({
            "event": "status_update",
            "message": message,
            "color": color
        })

    def schedule_camera_frame(self, cv2_frame):
        self.update_camera_frame(cv2_frame)

    def update_camera_frame(self, cv2_frame):
        if cv2_frame is None or cv2 is None:
            self._broadcast_event({"event": "camera_frame", "image": None})
            return

        now = time.time()
        # Throttle camera preview stream to ~12 FPS over WebSocket to prevent network congestion
        if now - self._last_cam_time < 0.08:
            return
        self._last_cam_time = now

        try:
            # Resize for smooth Web transmission
            h, w = cv2_frame.shape[:2]
            target_w = 400
            target_h = int(h * (target_w / float(w)))
            small = cv2.resize(cv2_frame, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
            _, buffer = cv2.imencode(".jpg", small, [cv2.IMWRITE_JPEG_QUALITY, 60])
            b64_str = base64.b64encode(buffer).decode("utf-8")
            self._broadcast_event({
                "event": "camera_frame",
                "image": f"data:image/jpeg;base64,{b64_str}"
            })
        except Exception as e:
            logger.debug(f"Failed to encode camera frame: {e}")

    def show_sending(self):
        self._broadcast_event({"event": "show_sending"})

    def show_result(self, total_items: int, total_ml: float, total_score: float, success: bool = True):
        self._broadcast_event({
            "event": "show_result",
            "total_items": total_items,
            "total_ml": total_ml,
            "total_score": total_score,
            "success": success
        })

    def set_waste_levels(self, levels: dict):
        if levels:
            manager.latest_state["waste_levels"] = levels
            self._broadcast_event({
                "event": "waste_levels",
                "data": levels
            })

    def set_server_status(self, online: bool):
        manager.latest_state["server_status"] = online
        self._broadcast_event({
            "event": "server_status",
            "online": online
        })

    def _start_server(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        config = uvicorn.Config(
            app=app,
            host="0.0.0.0",
            port=self.port,
            log_level="warning",
            loop="asyncio"
        )
        server = uvicorn.Server(config)
        self.loop.run_until_complete(server.serve())

    def _launch_browser(self):
        """เปิดเบราว์เซอร์ในโหมด Kiosk เต็มจอ"""
        url = f"http://localhost:{self.port}"
        time.sleep(1.2)  # Wait for server to warm up

        if sys.platform.startswith("linux"):
            # Raspberry Pi Chromium Kiosk Mode
            chrome_cmds = [
                "chromium-browser",
                "chromium",
                "google-chrome"
            ]
            launched = False
            for cmd in chrome_cmds:
                try:
                    subprocess.Popen([
                        cmd,
                        "--kiosk",
                        "--noerrdialogs",
                        "--disable-infobars",
                        "--check-for-update-interval=31536000",
                        "--disable-pinch",
                        "--overscroll-history-navigation=0",
                        url
                    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    logger.info(f"Launched Chromium Kiosk via '{cmd}'")
                    launched = True
                    break
                except FileNotFoundError:
                    continue

            if not launched:
                logger.warning("Chromium not found. Please open browser manually to: " + url)
        else:
            # Windows / macOS for development
            import webbrowser
            logger.info(f"Opening browser at: {url}")
            webbrowser.open(url)

    def run(self):
        """เริ่ม Web Server และ Kiosk Browser"""
        self.running = True
        logger.info(f"Starting SBAY Web Kiosk on port {self.port}...")

        self.server_thread = threading.Thread(target=self._start_server, daemon=True)
        self.server_thread.start()

        # Launch browser in a background thread
        browser_thread = threading.Thread(target=self._launch_browser, daemon=True)
        browser_thread.start()

        logger.info(f"SBAY Web Kiosk is running at http://localhost:{self.port}")
        logger.info("Press Ctrl+C to terminate.")

        try:
            while self.running:
                time.sleep(0.5)
        except KeyboardInterrupt:
            logger.info("Web Kiosk shutting down...")
        finally:
            self.running = False
