# ============================================================
# SBAY Smart Bin - Eco-Tech GUI
# ดีไซน์ใหม่สไตล์ Eco-tech (Canvas-based) พร้อม Sleeping Animation
# ============================================================

import json
import math
import random
import sys
import os
import time
import logging
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import messagebox

try:
    import cv2
except ImportError:
    cv2 = None

from PIL import Image, ImageTk

# กำหนด Path ให้เข้าถึงโมดูลหลักได้เสมอ
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from settings.config import WASTE_LABELS, USE_IR
try:
    from settings.config import GUI_FULLSCREEN
except ImportError:
    GUI_FULLSCREEN = sys.platform.startswith("linux")

logger = logging.getLogger("gui")

# กำหนดฟอนต์ตามระบบปฏิบัติการ
FONT = "Segoe UI" if sys.platform.startswith("win") else "DejaVu Sans"

# ขนาดหน้าจอมาตรฐานสำหรับคำนวณสเกล (Base Reference Resolution)
BASE_WIDTH, BASE_HEIGHT = 1024, 600

# พาเลทสี Eco-tech จาก Concept Design
COLORS = {
    "forest": "#123C2D",
    "deep": "#0A2B22",
    "green": "#72BE44",
    "lime": "#B8E36D",
    "mint": "#65F0A1",
    "sky": "#62B9D6",
    "cream": "#F7F5E9",
    "ink": "#173129",
    "muted": "#6B7C73",
    "danger": "#EF5D5D",
}


class SmartBinGUI:
    """
    SBAY Smart Bin - Eco-tech Canvas GUI
    รวมดีไซน์ Eco-tech Organic เข้ากับระบบถังขยะอัจฉริยะ และ Idle Sleeping Face Animation
    รองรับการปรับขยายขนาดเต็มหน้าจอทุกความละเอียด (Responsive Scaling / Fullscreen)
    """

    def __init__(self, on_phone_submit=None, on_finish=None):
        self.on_phone_submit = on_phone_submit
        self.on_finish = on_finish

        self.root = tk.Tk()
        self.root.title("SBAY · Eco-Tech Smart Bin")

        import settings.config as config
        # ควบคุม Fullscreen (เปิดอัตโนมัติบน Linux/Pi หรือตาม config.py)
        self.is_fullscreen = getattr(config, "GUI_FULLSCREEN", sys.platform.startswith("linux"))

        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()

        if self.is_fullscreen:
            try:
                self.root.attributes("-fullscreen", True)
            except Exception:
                pass
            self.width = screen_w
            self.height = screen_h
            self.root.geometry(f"{self.width}x{self.height}+0+0")
        else:
            self.width = min(1024, screen_w)
            self.height = min(600, screen_h)
            self.root.geometry(f"{self.width}x{self.height}")

        self.root.configure(bg=COLORS["deep"])

        # คีย์ลัด
        self.root.bind("<Escape>", self._on_escape)
        self.root.bind("<F11>", self._toggle_fullscreen)
        self.root.bind("<c>", self._toggle_cursor)
        self.root.bind("<C>", self._toggle_cursor)
        self.root.bind("<Key>", self._on_key_press)
        self.root.bind("<Configure>", self._on_window_configure)

        # จัดการเส้นทางบันทึกประวัติ (data/history.json)
        self.history_path = Path(__file__).resolve().parent / "data" / "history.json"
        self.history_path.parent.mkdir(exist_ok=True)

        # ควบคุม Cursor เมาส์
        self.cursor_hidden = getattr(config, "HIDE_CURSOR", False)

        # Canvas หลักสำหรับวาด Eco-tech UI ทั้งหมด เต็มพื้นที่หน้าต่าง
        self.container = tk.Frame(self.root, bg=COLORS["deep"])
        self.container.pack(fill="both", expand=True)

        self.canvas = tk.Canvas(
            self.container, width=self.width, height=self.height,
            bg=COLORS["deep"], bd=0, highlightthickness=0
        )
        self.canvas.pack(fill="both", expand=True)

        # สถานะระบบ
        self.page = "idle"
        self.phone = ""
        self.phone_var = tk.StringVar(value="")
        self.items_list = []
        self.particles = []
        self.anim_id = None
        self.idle_face = None
        self.cam_photo = None
        self.cam_label = None

        # Mascot animation & transition timers
        self.zoom_timer = None
        self.blink_timer = None
        self._current_zoom_photo = None

        self._recalculate_scale()
        self._setup_scaled_canvas()
        self._load_mascot_assets()
        self._apply_cursor()

        # เริ่มต้นที่หน้าจอ IDLE (Sleeping Animation)
        self.show_idle()

    # ============================================================
    # RESPONSIVE SCALING & CANVAS ADAPTER
    # ============================================================
    def _recalculate_scale(self):
        """คำนวณสเกลการแสดงผลและจุดกึ่งกลาง (Offset) ตามขนาดจอจริง"""
        self.root.update_idletasks()
        w = self.root.winfo_width()
        h = self.root.winfo_height()
        if w <= 1 or h <= 1:
            w = self.root.winfo_screenwidth()
            h = self.root.winfo_screenheight()

        self.width = w
        self.height = h

        # สเกลตามแบบมาตรฐาน BASE_WIDTH x BASE_HEIGHT (1024x600)
        self.scale = max(0.5, min(self.width / float(BASE_WIDTH), self.height / float(BASE_HEIGHT)))
        self.offset_x = int((self.width - BASE_WIDTH * self.scale) / 2.0)
        self.offset_y = int((self.height - BASE_HEIGHT * self.scale) / 2.0)

    def sx(self, x):
        return int(x * self.scale + self.offset_x)

    def sy(self, y):
        return int(y * self.scale + self.offset_y)

    def sr(self, r):
        return max(2, int(r * self.scale))

    def sf(self, size):
        return max(7, int(size * self.scale))

    def _setup_scaled_canvas(self):
        """เชื่อมต่อ Canvas methods เพื่อให้พิกัดและขนาดฟอนต์สเกลตามหน้าจอโดยอัตโนมัติ"""
        self._orig_create_text = self.canvas.create_text
        self._orig_create_oval = self.canvas.create_oval
        self._orig_create_polygon = self.canvas.create_polygon
        self._orig_create_line = self.canvas.create_line
        self._orig_create_window = self.canvas.create_window

        def scaled_create_text(x, y, *args, **kwargs):
            sx, sy = self.sx(x), self.sy(y)
            if "font" in kwargs and kwargs["font"]:
                f = kwargs["font"]
                if isinstance(f, tuple) and len(f) >= 2 and isinstance(f[1], (int, float)):
                    kwargs["font"] = (f[0], self.sf(f[1])) + tuple(f[2:])
            if "width" in kwargs and kwargs["width"]:
                kwargs["width"] = int(kwargs["width"] * self.scale)
            return self._orig_create_text(sx, sy, *args, **kwargs)

        def scaled_create_oval(x1, y1, x2, y2, *args, **kwargs):
            if "ambient" in kwargs.get("tags", ""):
                return self._orig_create_oval(x1, y1, x2, y2, *args, **kwargs)
            return self._orig_create_oval(self.sx(x1), self.sy(y1), self.sx(x2), self.sy(y2), *args, **kwargs)

        def scaled_create_line(x1, y1, x2, y2, *args, **kwargs):
            if "background" in kwargs.get("tags", "") or "ambient" in kwargs.get("tags", ""):
                return self._orig_create_line(x1, y1, x2, y2, *args, **kwargs)
            w = kwargs.get("width", 1)
            if w > 1:
                kwargs["width"] = max(1, int(w * self.scale))
            return self._orig_create_line(self.sx(x1), self.sy(y1), self.sx(x2), self.sy(y2), *args, **kwargs)

        def scaled_create_window(x, y, *args, **kwargs):
            sx, sy = self.sx(x), self.sy(y)
            if "width" in kwargs and kwargs["width"]:
                kwargs["width"] = max(10, int(kwargs["width"] * self.scale))
            if "height" in kwargs and kwargs["height"]:
                kwargs["height"] = max(10, int(kwargs["height"] * self.scale))
            return self._orig_create_window(sx, sy, *args, **kwargs)

        self.canvas.create_text = scaled_create_text
        self.canvas.create_oval = scaled_create_oval
        self.canvas.create_line = scaled_create_line
        self.canvas.create_window = scaled_create_window

    # ============================================================
    # DRAWING & ENVIRONMENT UTILITIES (จาก SBAY_GUI_Concept)
    # ============================================================
    @staticmethod
    def rounded_points(x1, y1, x2, y2, radius):
        return [
            x1 + radius, y1, x2 - radius, y1, x2, y1, x2, y1 + radius,
            x2, y2 - radius, x2, y2, x2 - radius, y2, x1 + radius, y2,
            x1, y2, x1, y2 - radius, x1, y1 + radius, x1, y1,
        ]

    def round_rect(self, x1, y1, x2, y2, radius=24, **kwargs):
        sx1, sy1 = self.sx(x1), self.sy(y1)
        sx2, sy2 = self.sx(x2), self.sy(y2)
        sr = self.sr(radius)
        return self._orig_create_polygon(
            self.rounded_points(sx1, sy1, sx2, sy2, sr),
            smooth=True, splinesteps=10, **kwargs,
        )

    def gradient(self, top="#174A36", bottom="#0A2B22"):
        tr, tg, tb = self.root.winfo_rgb(top)
        br, bg, bb = self.root.winfo_rgb(bottom)
        step = max(8, int(10 * self.scale))
        for y in range(0, self.height, step):
            ratio = y / max(1, self.height)
            r = int((tr + (br - tr) * ratio) / 256)
            g = int((tg + (bg - tg) * ratio) / 256)
            b = int((tb + (bb - tb) * ratio) / 256)
            self._orig_create_line(0, y, self.width, y, fill=f"#{r:02x}{g:02x}{b:02x}", width=step, tags="background")

    def draw_environment(self):
        """วาดพื้นหลัง organic, คลื่นด้านล่าง, ใบไม้ เต็มพื้นที่หน้าจอ (Static ประหยัด CPU บน Raspberry Pi และจอสัมผัส)"""
        self._stop_animation()
        self.canvas.delete("all")
        self.particles.clear()
        self.gradient()

        w, h = self.width, self.height

        # คลื่นด้านล่างแบบ Organic
        wave1_pts = [
            -30, int(h - 95 * self.scale),
            int(w * 0.10), int(h - 135 * self.scale),
            int(w * 0.25), int(h - 80 * self.scale),
            int(w * 0.40), int(h - 115 * self.scale),
            int(w * 0.55), int(h - 70 * self.scale),
            int(w * 0.72), int(h - 125 * self.scale),
            int(w * 0.88), int(h - 90 * self.scale),
            w + 30, int(h - 130 * self.scale),
            w + 30, h + 30, -30, h + 30
        ]
        self._orig_create_polygon(wave1_pts, smooth=True, splinesteps=16, fill="#1D6046", outline="", tags="background")

        wave2_pts = [
            -30, int(h - 50 * self.scale),
            int(w * 0.14), int(h - 85 * self.scale),
            int(w * 0.31), int(h - 35 * self.scale),
            int(w * 0.48), int(h - 80 * self.scale),
            int(w * 0.65), int(h - 30 * self.scale),
            int(w * 0.82), int(h - 75 * self.scale),
            w + 30, int(h - 45 * self.scale),
            w + 30, h + 30, -30, h + 30
        ]
        self._orig_create_polygon(wave2_pts, smooth=True, splinesteps=16, fill="#247C57", outline="", tags="background")

        # สร้างอนุภาคแสงระยิบระยับแบบ static (ไม่เคลื่อนไหวเพื่อไม่ให้กิน CPU / Event loop)
        random.seed(12)
        palette = ["#2D6D50", "#3B805D", "#82C958", "#65F0A1", "#62B9D6"]
        for index in range(16):
            size = random.randint(5, 14) * max(1.0, self.scale * 0.8)
            x = random.randint(0, self.width)
            y = random.randint(20, max(50, self.height - 50))
            self._orig_create_oval(
                x - size, y - size, x + size, y + size,
                fill=random.choice(palette), outline="", stipple="gray50",
                tags="ambient",
            )

        # ใบไม้ลอยตามมุมจอ
        leaves = [
            (self.sx(70), self.sy(90), 1.0 * self.scale),
            (self.sx(915), self.sy(80), 0.85 * self.scale),
            (self.sx(930), self.sy(465), 1.1 * self.scale)
        ]
        for lx, ly, lscale in leaves:
            self._orig_create_line(lx, ly, lx + 48 * lscale, ly + 70 * lscale, fill="#75C762", width=max(2, int(4 * self.scale)), tags="ambient")
            for offset in (12, 30, 48):
                self._orig_create_oval(
                    lx + offset * lscale - 15 * lscale, ly + offset * lscale - 9 * lscale,
                    lx + offset * lscale + 12 * lscale, ly + offset * lscale + 9 * lscale,
                    fill="#8AD66B", outline="", tags="ambient",
                )

    def bind_button(self, tag, command, normal, pressed):
        last_click = [0.0]

        def _on_click(_e=None):
            now = time.time()
            if now - last_click[0] < 0.15:  # Debounce 150ms ป้องกัน double tap บนจอสัมผัส
                return "break"
            last_click[0] = now

            try:
                self.canvas.itemconfigure(f"{tag}_surface", fill=pressed)
                self.root.after(80, lambda: self._restore_surface(tag, normal))
            except Exception:
                pass
            if command and callable(command):
                command()
            return "break"

        self.canvas.tag_bind(tag, "<Button-1>", _on_click)
        if not self.cursor_hidden:
            self.canvas.tag_bind(tag, "<Enter>", lambda _e: self._set_cursor("hand2"))
            self.canvas.tag_bind(tag, "<Leave>", lambda _e: self._set_cursor(""))

    def _set_cursor(self, cur):
        if not self.cursor_hidden:
            try:
                self.canvas.config(cursor=cur)
            except Exception:
                pass

    def _restore_surface(self, tag, normal):
        try:
            self.canvas.itemconfigure(f"{tag}_surface", fill=normal)
        except Exception:
            pass


    def button(self, x1, y1, x2, y2, title, subtitle, fill, command, tag):
        compact = (y2 - y1) < 80
        self.round_rect(x1 + 5, y1 + 8, x2 + 5, y2 + 8, 26, fill="#061D17", outline="", tags=tag)
        self.round_rect(x1, y1, x2, y2, 26, fill=fill, outline="", tags=(tag, f"{tag}_surface"))
        title_y = (y1 + y2) / 2 if compact else y1 + 43
        self.canvas.create_text(
            (x1 + x2) / 2, title_y, text=title, fill=COLORS["ink"],
            font=(FONT, 18 if compact else 22, "bold"), tags=tag
        )
        if subtitle and not compact:
            self.canvas.create_text(
                (x1 + x2) / 2, y1 + 76, text=subtitle, fill="#285342",
                font=(FONT, 12, "bold"), tags=tag
            )
        self.bind_button(tag, command, fill, COLORS["cream"])

    def header(self, eyebrow, title, subtitle=""):
        self.canvas.create_text(64, 45, anchor="w", text=eyebrow.upper(), fill=COLORS["mint"], font=(FONT, 11, "bold"))
        self.canvas.create_text(64, 82, anchor="w", text=title, fill="white", font=(FONT, 28, "bold"))
        if subtitle:
            self.canvas.create_text(64, 114, anchor="w", text=subtitle, fill="#BFD8CD", font=(FONT, 13))

    def _start_animation(self):
        self._stop_animation()

    def _animate_step(self):
        pass

    def _stop_animation(self):
        if self.anim_id:
            try:
                self.root.after_cancel(self.anim_id)
            except Exception:
                pass
            self.anim_id = None

    def _load_mascot_assets(self):
        self.assets_dir = Path(__file__).resolve().parent / "assets"
        awake_path = self.assets_dir / "sbay_bot.png"
        sleep_path = self.assets_dir / "sbay_bot_sleep.png"
        half_path = self.assets_dir / "sbay_bot_blink_half.png"

        self.raw_mascot_awake = Image.open(awake_path).convert("RGBA") if awake_path.exists() else None
        self.raw_mascot_sleep = Image.open(sleep_path).convert("RGBA") if sleep_path.exists() else None
        self.raw_mascot_half = Image.open(half_path).convert("RGBA") if half_path.exists() else None

        self._update_mascot_photos()

    def _update_mascot_photos(self):
        tw = max(20, int(140 * self.scale))
        th = max(16, int(112 * self.scale))
        if self.raw_mascot_awake:
            self.mascot_photo_awake = ImageTk.PhotoImage(self.raw_mascot_awake.resize((tw, th), Image.Resampling.LANCZOS))
        else:
            self.mascot_photo_awake = None

        if self.raw_mascot_sleep:
            self.mascot_photo_sleep = ImageTk.PhotoImage(self.raw_mascot_sleep.resize((tw, th), Image.Resampling.LANCZOS))
        else:
            self.mascot_photo_sleep = self.mascot_photo_awake

        if self.raw_mascot_half:
            self.mascot_photo_half = ImageTk.PhotoImage(self.raw_mascot_half.resize((tw, th), Image.Resampling.LANCZOS))
        else:
            self.mascot_photo_half = self.mascot_photo_awake

    def _clear(self):
        """ล้างหน้าจอและหยุดแอนิเมชันเดิม"""
        self._stop_animation()
        self._stop_mascot_blinking()
        if hasattr(self, 'zoom_timer') and self.zoom_timer:
            try:
                self.root.after_cancel(self.zoom_timer)
            except Exception:
                pass
            self.zoom_timer = None

        for timer_attr in ('_welcome_timer', '_result_timer'):
            if hasattr(self, timer_attr) and getattr(self, timer_attr):
                try:
                    self.root.after_cancel(getattr(self, timer_attr))
                except Exception:
                    pass
                setattr(self, timer_attr, None)

        if hasattr(self, 'idle_face') and self.idle_face:
            self.idle_face.stop()
            self.idle_face = None

        # ทำลาย widget ลูกที่อาจหลงเหลืออยู่ใน container นอกจาก self.canvas
        for child in self.container.winfo_children():
            if child != self.canvas:
                try:
                    child.destroy()
                except Exception:
                    pass

        self.root.configure(bg=COLORS["deep"])
        self.container.configure(bg=COLORS["deep"])
        self.canvas.configure(bg=COLORS["deep"])
        self.canvas.delete("all")
        try:
            self.canvas.unbind("<Button-1>")
        except Exception:
            pass
        try:
            self.root.unbind("<Key>")
        except Exception:
            pass

    # ============================================================
    # SCREEN 1: IDLE (Sleeping & Waking Face Animation)
    # ============================================================
    def show_idle(self):
        """หน้าจอตอนไม่มีคนใช้งาน: แสดง Animation หน้าตานอนหลับ และสะดุ้งตื่นเมื่อแตะจอ"""
        self._clear()
        self.page = "idle"

        # ตั้งค่าพื้นหลังสีขาวสำหรับ Animation ตามที่ดีไซน์ไว้
        self.root.configure(bg="#ffffff")
        self.container.configure(bg="#ffffff")
        self.canvas.configure(bg="#ffffff")

        from idle_animation import IdleSleepingFace
        self.idle_face = IdleSleepingFace(
            root=self.root,
            container=self.container,
            canvas=self.canvas,
            width=self.width,
            height=self.height,
            on_wake_complete=self.transition_zoom_out_to_phone  # เมื่อสะดุ้งตื่นแล้ว เล่น Zoom Out transition ไปยังหน้ากรอกเบอร์
        )
        self.idle_face.start()

    def show_home(self):
        """เข้าสู่หน้าหลักของระบบ (เปิดหน้ากรอกเบอร์โทรศัพท์โดยตรง)"""
        self.show_phone_input()

    # ============================================================
    # TRANSITION: ZOOM OUT TO PHONE INPUT
    # ============================================================
    def transition_zoom_out_to_phone(self):
        """เล่น Transition Zoom Out จาก Mascot ตื่น ไปยังตำแหน่งบนกล่องหมายเลขโทรศัพท์ตามรูปแรก"""
        if hasattr(self, 'idle_face') and self.idle_face:
            self.idle_face.stop()
            self.idle_face = None

        self._clear()
        self.page = "transition"
        self.phone = ""

        # วาดโครงหน้าจอ Phone Input ทั้งหมด
        self._draw_phone_screen_base()

        # ซ่อน mascot ในตำแหน่งคงที่ไว้ชั่วคราวระหว่าง zoom
        self.canvas.itemconfigure("phone_mascot", state="hidden")

        # คำนวณพิกัดเริ่มต้น (Center หน้าจอ ขนาดใหญ่ตอนตื่น)
        start_w = int(360 * self.scale)
        start_h = int(288 * self.scale)
        start_cx = self.width // 2
        start_cy = int(self.height * 0.42)

        # พิกัดปลายทาง (บนกล่องหมายเลขโทรศัพท์ตามรูปแรก)
        end_w = max(20, int(140 * self.scale))
        end_h = max(16, int(112 * self.scale))
        end_x1 = self.sx(459)
        end_y1 = self.sy(49)
        end_cx = end_x1 + end_w // 2
        end_cy = end_y1 + end_h // 2

        total_steps = 12
        step_interval = 22  # รวม ~260ms นุ่มนวลและไม่กระตุก

        def _step(step_idx):
            if self.page != "transition":
                return

            if step_idx > total_steps:
                # ซูมเสร็จสิ้น เข้าสู่หน้า phone ปกติ และเริ่มกระพริบตาทันที
                self.canvas.delete("zoom_mascot")
                self.canvas.itemconfigure("phone_mascot", state="normal")
                self.page = "phone"
                self._start_mascot_blinking()
                return

            t = step_idx / float(total_steps)
            ease = 1.0 - (1.0 - t) ** 3  # Ease-out cubic

            cur_w = max(20, int(start_w + (end_w - start_w) * ease))
            cur_h = max(16, int(start_h + (end_h - start_h) * ease))
            cur_cx = int(start_cx + (end_cx - start_cx) * ease)
            cur_cy = int(start_cy + (end_cy - start_cy) * ease)

            if self.raw_mascot_awake:
                img_res = self.raw_mascot_awake.resize((cur_w, cur_h), Image.Resampling.BILINEAR)
                photo = ImageTk.PhotoImage(img_res)
                self._current_zoom_photo = photo
                self.canvas.delete("zoom_mascot")
                self.canvas.create_image(cur_cx, cur_cy, image=photo, tags="zoom_mascot")

            self.zoom_timer = self.root.after(step_interval, lambda: _step(step_idx + 1))

        _step(0)

    # ============================================================
    # SCREEN 3: PHONE INPUT (Keypad & Identification)
    # ============================================================
    def _draw_phone_screen_base(self):
        """วาดองค์ประกอบหน้ากรอกเบอร์โทรศัพท์ทั้งหมด"""
        self.draw_environment()
        self.header("STEP 01 · IDENTIFY", "กรอกหมายเลขโทรศัพท์", "ใช้สำหรับสะสมคะแนนและตรวจสอบประวัติ")

        # วาดน้อง Mascot ยืนบนขอบกล่องหมายเลขโทรศัพท์ (x=459, y=49 ตามรูปแรก)
        self._draw_phone_mascot()

        # กล่องข้อมูลเบอร์โทรฝั่งซ้าย (ปิดทับส่วนล่างของ Mascot พอดี)
        self.round_rect(55, 155, 595, 535, 32, fill=COLORS["cream"], outline="", tags="content")
        self.canvas.create_text(96, 195, anchor="w", text="หมายเลขโทรศัพท์ของคุณ", fill=COLORS["muted"], font=(FONT, 13, "bold"), tags="content")

        # ช่องแสดงเบอร์โทรศัพท์
        self.round_rect(92, 222, 558, 305, 18, fill="white", outline="#D9E3DB", width=2, tags="content")
        self.canvas.create_text(
            325, 263, anchor="center", text="0XX-XXX-XXXX",
            fill="#A8B2AC", font=(FONT, 28, "bold"), tags="phone_text"
        )

        # เงื่อนไข & แนะนำ
        self.round_rect(92, 330, 558, 380, 16, fill="#E3F2C7", outline="", tags="content")
        self.canvas.create_text(116, 355, anchor="w", text="✓", fill="#2A824C", font=(FONT, 18, "bold"), tags="content")
        self.canvas.create_text(145, 355, anchor="w", text="กรอกให้ครบ 10 หลัก และขึ้นต้นด้วย 0", fill="#356046", font=(FONT, 12, "bold"), tags="content")

        # ปุ่มข้ามขั้นตอน (Guest Mode)
        self.button(
            92, 412, 558, 482,
            "ข้ามขั้นตอน (Guest Mode) ➔", "",
            "#E2EBE5", lambda: self.confirm_phone(is_guest=True), "guest_btn"
        )

        # แป้นพิมพ์ตัวเลขฝั่งขวา (3x4 Grid)
        self.round_rect(636, 45, 971, 555, 34, fill="#FDFCF5", outline="", tags="content")
        keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "✓", "0", "⌫"]
        for index, key in enumerate(keys):
            row, col = divmod(index, 3)
            x1, y1 = 667 + col * 98, 87 + row * 108
            x2, y2 = x1 + 72, y1 + 78
            fill = COLORS["mint"] if key == "✓" else COLORS["danger"] if key == "⌫" else "#E8ECE9"
            tag = f"num_{index}"

            self.round_rect(x1 + 3, y1 + 5, x2 + 3, y2 + 5, 18, fill="#B6C2BA", outline="", tags=tag)
            self.round_rect(x1, y1, x2, y2, 18, fill=fill, outline="", tags=(tag, f"{tag}_surface"))
            self.canvas.create_text((x1 + x2) / 2, (y1 + y2) / 2, text=key, fill=COLORS["ink"], font=(FONT, 23, "bold"), tags=tag)

            if key == "✓":
                action = lambda: self.confirm_phone(is_guest=False)
            elif key == "⌫":
                action = self.backspace
            else:
                action = lambda digit=key: self.add_digit(digit)

            self.bind_button(tag, action, fill, "#FFFFFF")

        self.update_phone_text()

    def _draw_phone_mascot(self):
        """วาดน้อง Mascot ยืนบนขอบกล่องหมายเลขโทรศัพท์ (x=459, y=49 ตามรูปแรก)"""
        self.canvas.delete("phone_mascot")
        if not hasattr(self, 'mascot_photo_awake') or not self.mascot_photo_awake:
            self._update_mascot_photos()

        mx = self.sx(459)
        my = self.sy(49)
        tw = max(20, int(140 * self.scale))
        th = max(16, int(112 * self.scale))
        cx = mx + tw // 2
        cy = my + th // 2

        self.canvas.create_image(
            cx, cy,
            image=self.mascot_photo_awake,
            tags="phone_mascot"
        )

    def _start_mascot_blinking(self):
        """เริ่ม Loop ให้ Mascot ยืนกระพริบตาเป็นระยะ"""
        self._stop_mascot_blinking()
        if self.page != "phone":
            return
        delay = random.randint(2500, 4200)
        self.blink_timer = self.root.after(delay, self._play_mascot_blink)

    def _play_mascot_blink(self):
        """เล่นจังหวะกระพริบตา: ครึ่งตา -> หลับตา -> ครึ่งตา -> ตาโต"""
        if self.page != "phone" or not hasattr(self, 'mascot_photo_awake') or not self.mascot_photo_awake:
            return

        def _set_mascot_img(photo):
            if self.page == "phone" and self.canvas:
                try:
                    self.canvas.itemconfigure("phone_mascot", image=photo)
                except Exception:
                    pass

        is_double = (random.random() < 0.28)

        _set_mascot_img(self.mascot_photo_half)
        self.root.after(45, lambda: _set_mascot_img(self.mascot_photo_sleep))
        self.root.after(115, lambda: _set_mascot_img(self.mascot_photo_half))
        self.root.after(160, lambda: _set_mascot_img(self.mascot_photo_awake))

        if is_double:
            self.root.after(270, lambda: _set_mascot_img(self.mascot_photo_half))
            self.root.after(315, lambda: _set_mascot_img(self.mascot_photo_sleep))
            self.root.after(380, lambda: _set_mascot_img(self.mascot_photo_half))
            self.root.after(430, lambda: _set_mascot_img(self.mascot_photo_awake))
            next_interval = 480
        else:
            next_interval = 200

        self.blink_timer = self.root.after(next_interval, self._start_mascot_blinking)

    def _stop_mascot_blinking(self):
        """หยุดการกระพริบตา"""
        if hasattr(self, 'blink_timer') and self.blink_timer:
            try:
                self.root.after_cancel(self.blink_timer)
            except Exception:
                pass
            self.blink_timer = None

    def show_phone_input(self):
        """หน้าจอกรอกเบอร์โทรศัพท์ด้วยแป้นพิมพ์สไตล์ Eco-tech"""
        self._clear()
        self.page = "phone"
        self.phone = ""
        self._draw_phone_screen_base()
        self._start_mascot_blinking()


    def formatted_phone(self):
        if not self.phone:
            return "0XX-XXX-XXXX"
        d = self.phone
        return d[:3] + ("-" + d[3:6] if len(d) > 3 else "") + ("-" + d[6:] if len(d) > 6 else "")

    def update_phone_text(self):
        self.canvas.itemconfigure(
            "phone_text",
            text=self.formatted_phone(),
            fill=COLORS["ink"] if self.phone else "#A8B2AC"
        )

    def add_digit(self, digit):
        if len(self.phone) < 10:
            self.phone += digit
            self.phone_var.set(self.phone)
            self.update_phone_text()

    def backspace(self):
        if self.phone:
            self.phone = self.phone[:-1]
            self.phone_var.set(self.phone)
            self.update_phone_text()
        else:
            self.show_idle()


    def confirm_phone(self, is_guest=False):
        """ยืนยันเบอร์โทรศัพท์และส่งข้อมูลเข้า Session"""
        if is_guest:
            target_phone = None
            display_name = "Guest"
        else:
            if len(self.phone) != 10 or not self.phone.startswith("0"):
                messagebox.showwarning(
                    "ตรวจสอบหมายเลข",
                    "กรุณากรอกหมายเลขโทรศัพท์ 10 หลัก และขึ้นต้นด้วย 0",
                    parent=self.root
                )
                return
            target_phone = self.phone
            display_name = self.formatted_phone()

            # บันทึกลงประวัติ
            records = self.read_history()
            records.insert(0, {
                "phone": self.phone,
                "used_at": datetime.now().isoformat(timespec="seconds"),
                "points": 0
            })
            try:
                self.history_path.write_text(json.dumps(records[:20], ensure_ascii=False, indent=2), encoding="utf-8")
            except Exception as e:
                logger.error(f"Failed to write history: {e}")

        # ส่ง Callback ให้ Controller (เช่น main_controller.py)
        if self.on_phone_submit and callable(self.on_phone_submit):
            try:
                self.on_phone_submit(target_phone)
            except Exception as e:
                logger.error(f"Error executing on_phone_submit: {e}")
                self.show_welcome(display_name)
        else:
            # Standalone / Default mode: ไปหน้า Welcome ทันที
            self.show_welcome(display_name)

    # ============================================================
    # SCREEN 4: HISTORY (ประวัติการใช้งาน)
    # ============================================================
    def read_history(self):
        try:
            return json.loads(self.history_path.read_text(encoding="utf-8")) if self.history_path.exists() else []
        except (OSError, json.JSONDecodeError):
            return []

    def show_history(self):
        """แสดงประวัติการใช้งาน"""
        self._clear()
        self.page = "history"
        self.draw_environment()
        self.header("ACTIVITY LOG", "ประวัติการใช้งาน", "รายการล่าสุดจากเครื่อง SBAY")

        self.round_rect(55, 145, 969, 535, 34, fill=COLORS["cream"], outline="", tags="content")
        records = self.read_history()
        if not records:
            self.canvas.create_oval(448, 210, 576, 338, fill="#E3F2C7", outline="")
            self.canvas.create_text(512, 274, text="↻", fill="#4D8B59", font=(FONT, 42, "bold"))
            self.canvas.create_text(512, 375, text="ยังไม่มีประวัติการใช้งาน", fill=COLORS["ink"], font=(FONT, 20, "bold"))
            self.canvas.create_text(512, 407, text="เมื่อเริ่มใช้งาน รายการจะแสดงที่นี่", fill=COLORS["muted"], font=(FONT, 12))
        else:
            for i, record in enumerate(records[:4]):
                y = 175 + i * 72
                self.round_rect(88, y, 936, y + 56, 16, fill="#FFFFFF", outline="#DDE6DF", width=1)
                phone = record.get("phone", "-")
                masked = f"{phone[:3]}-XXX-{phone[-4:]}" if len(phone) == 10 else phone
                points = record.get("points", 0)

                self.canvas.create_oval(105, y + 13, 135, y + 43, fill=COLORS["mint"], outline="")
                self.canvas.create_text(150, y + 28, anchor="w", text=masked, fill=COLORS["ink"], font=(FONT, 15, "bold"))
                self.canvas.create_text(480, y + 28, anchor="w", text=f"+{points:.1f} pt", fill=COLORS["forest"], font=(FONT, 14, "bold"))
                self.canvas.create_text(710, y + 28, anchor="w", text=record.get("used_at", "").replace("T", "  "), fill=COLORS["muted"], font=(FONT, 12))

        self.button(760, 465, 930, 515, "ย้อนกลับ", "", COLORS["lime"], self.show_phone_input, "back")


    # ============================================================
    # SCREEN 5: WELCOME (ต้อนรับและให้เริ่มหยอดขยะ)
    # ============================================================
    def show_welcome(self, name):
        """แสดงข้อความต้อนรับและชวนหยอดขยะ"""
        self._clear()
        self.page = "welcome"
        self.items_list = []
        self.draw_environment()

        # การ์ดต้อนรับตรงกลาง
        self.round_rect(180, 100, 844, 500, 36, fill=COLORS["cream"], outline="", tags=("content", "welcome_card"))
        self.canvas.create_oval(462, 135, 562, 235, fill=COLORS["mint"], outline="", tags=("content", "welcome_card"))
        self.canvas.create_text(512, 185, text="👋", font=("Segoe UI Emoji", 48), tags=("content", "welcome_card"))

        self.canvas.create_text(
            512, 280, text=f"สวัสดีคุณ {name}",
            fill=COLORS["forest"], font=(FONT, 30, "bold"), tags=("content", "welcome_card")
        )
        self.canvas.create_text(
            512, 335, text="กรุณาหยอดขวดหรือกระป๋องลงในตู้",
            fill=COLORS["ink"], font=(FONT, 20), tags=("content", "welcome_card")
        )
        self.round_rect(330, 385, 694, 435, 20, fill="#E3F2C7", outline="", tags=("content", "welcome_card"))
        self.canvas.create_text(512, 410, text="✨ ระบบพร้อมตรวจจับอัตโนมัติ (แตะเพื่อเริ่มทันที)", fill="#2A824C", font=(FONT, 14, "bold"), tags=("content", "welcome_card"))

        # แตะที่การ์ดเพื่อข้ามไปหน้าตรวจจับทันที
        self.canvas.tag_bind("welcome_card", "<Button-1>", lambda e: self.show_detecting())

        # สลับไปหน้า Detecting อัตโนมัติหลังจาก 2.2 วินาที
        self._welcome_timer = self.root.after(2200, self.show_detecting)

    # ============================================================
    # SCREEN 6: DETECTING (กำลังตรวจจับขยะ + กล้อง)
    # ============================================================
    def show_detecting(self):
        """หน้าจอแสดงภาพจากกล้องและรายการขยะที่ตรวจจับได้"""
        self._clear()
        self.page = "detecting"
        self.draw_environment()

        self.header("STEP 02 · RECYCLING", "กำลังตรวจจับขยะ...", "ระบบจะคัดแยกและคำนวณคะแนนอัตโนมัติ")

        # แถบแสดงจำนวนชิ้น
        self.round_rect(750, 48, 960, 108, 22, fill="#E3F2C7", outline="")
        self.item_count_text = self.canvas.create_text(
            855, 78, text=f"●  {len(self.items_list)} ชิ้น",
            fill="#2A824C", font=(FONT, 18, "bold")
        )

        # 1. ฝั่งซ้าย: กล่องแสดงรายการขยะ
        self.round_rect(55, 140, 505, 535, 28, fill=COLORS["cream"], outline="", tags="content")
        self.canvas.create_text(85, 172, anchor="w", text="รายการที่คัดแยกได้", fill=COLORS["forest"], font=(FONT, 16, "bold"))

        # กรอบรายการขยะ (Scrollable Frame)
        self.list_container = tk.Frame(self.canvas, bg=COLORS["cream"], bd=0)
        self.items_canvas = tk.Canvas(self.list_container, bg=COLORS["cream"], highlightthickness=0)
        self.items_inner = tk.Frame(self.items_canvas, bg=COLORS["cream"])
        self.items_window = self.items_canvas.create_window((0, 0), window=self.items_inner, anchor="nw")

        self.items_inner.bind("<Configure>", lambda e: self.items_canvas.configure(scrollregion=self.items_canvas.bbox("all")))
        self.items_canvas.bind("<Configure>", lambda e: self.items_canvas.itemconfig(self.items_window, width=e.width))

        self.items_canvas.pack(fill="both", expand=True, padx=10, pady=5)
        self.canvas.create_window(280, 315, window=self.list_container, width=420, height=255, tags="content")

        # ข้อความสถานะการหยอด
        status_msg = "สแตนด์บาย: รอการหยอดขยะ..." if USE_IR else "สแตนด์บาย: กล้องพร้อมทำงาน..."
        self.status_text = self.canvas.create_text(
            280, 485, text=status_msg,
            fill=COLORS["muted"], font=(FONT, 12, "bold"), width=390
        )

        # 2. ฝั่งขวา: กล่องแสดงภาพกล้อง (Camera Frame)
        self.round_rect(530, 140, 969, 445, 28, fill="#061D17", outline="")
        self.round_rect(535, 145, 964, 440, 24, fill="#123C2D", outline="")

        self.cam_container = tk.Frame(self.canvas, bg="#123C2D", bd=0)
        self.cam_label = tk.Label(
            self.cam_container, text="📷 ภาพกล้องวงจรปิด",
            bg="#061D17", fg=COLORS["mint"], font=(FONT, 13, "bold")
        )
        self.cam_label.pack(fill="both", expand=True)
        self.canvas.create_window(750, 292, window=self.cam_container, width=410, height=280, tags="content")

        # 3. ปุ่มเสร็จสิ้น (Finish Button)
        self.button(535, 465, 965, 535, "✅  เสร็จสิ้น (FINISH)", "", COLORS["mint"], self._handle_finish, "finish_btn")

        # โหลดรายการที่อาจมีอยู่เดิมขึ้นมาแสดง
        for item in self.items_list:
            self._render_item_row(item["type"], item["ml"], item["score"])

    def add_detected_item(self, item_type, size_ml, score):
        """เพิ่มรายการขยะที่ตรวจจับได้"""
        item_data = {"type": item_type, "ml": size_ml, "score": score}
        self.items_list.append(item_data)

        if self.page == "detecting":
            self._render_item_row(item_type, size_ml, score)
            self.canvas.itemconfigure(self.item_count_text, text=f"●  {len(self.items_list)} ชิ้น")
            label_name = WASTE_LABELS.get(item_type, item_type)
            self.update_status(f"🎉 ตรวจพบ: {label_name} ({size_ml}ml) +{score:.1f} pt", COLORS["mint"])

    def _render_item_row(self, item_type, size_ml, score):
        if not hasattr(self, 'items_inner') or not self.items_inner.winfo_exists():
            return

        label_name = WASTE_LABELS.get(item_type, item_type)
        row = tk.Frame(self.items_inner, bg="white", padx=12, pady=6, bd=0)
        row.pack(fill="x", pady=4, padx=5)

        tk.Label(row, text=f"♻️ {label_name}", font=(FONT, 11, "bold"), fg=COLORS["forest"], bg="white").pack(side="left")

        # ขนาด ml และคะแนน
        lower_bound = size_ml - (size_ml % 10)
        size_str = f"{lower_bound}-{lower_bound + 20}ml"
        tk.Label(row, text=f"{size_str}  ·  +{score:.1f} pt", font=(FONT, 11, "bold"), fg="#2A824C", bg="white").pack(side="right")

    def update_status(self, message, color=None):
        """อัปเดตข้อความสถานะในหน้าตรวจจับ"""
        if hasattr(self, 'status_text') and self.canvas:
            self.canvas.itemconfigure(self.status_text, text=message)
            if color:
                self.canvas.itemconfigure(self.status_text, fill=color)

    def update_camera_frame(self, cv2_frame):
        """อัปเดตภาพจากกล้องบนจอ"""
        try:
            if not hasattr(self, 'cam_label') or not self.cam_label or not self.cam_label.winfo_exists():
                return

            if cv2_frame is not None and cv2 is not None:
                rgb = cv2.cvtColor(cv2_frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(rgb)
                img = img.resize((410, 280), Image.LANCZOS)
                self.cam_photo = ImageTk.PhotoImage(image=img)
                self.cam_label.configure(image=self.cam_photo, text="")
            else:
                self.cam_label.configure(image="", text="📷 กล้องปิดอยู่ (Standby)")
        except Exception as e:
            logger.debug(f"Camera frame skipped: {e}")

    # ============================================================
    # SCREEN 7: SENDING (กำลังส่งข้อมูล)
    # ============================================================
    def show_sending(self):
        """หน้าจอกำลังส่งข้อมูลไป Backend"""
        self._clear()
        self.page = "sending"
        self.draw_environment()

        self.round_rect(240, 140, 784, 460, 36, fill=COLORS["cream"], outline="", tags="content")
        self.canvas.create_oval(462, 180, 562, 280, fill=COLORS["sky"], outline="")
        self.canvas.create_text(512, 230, text="📡", font=("Segoe UI Emoji", 48))

        self.canvas.create_text(512, 330, text="กำลังส่งข้อมูลไปยังเซิร์ฟเวอร์...", fill=COLORS["forest"], font=(FONT, 24, "bold"))
        self.canvas.create_text(512, 380, text="กรุณารอสักครู่ ระบบกำลังประมวลผลคะแนน", fill=COLORS["muted"], font=(FONT, 14))

    # ============================================================
    # SCREEN 8: RESULT (สรุปผลคะแนน & ขอบคุณ)
    # ============================================================
    def show_result(self, total_items, total_ml, total_score, success=True):
        """หน้าจอแสดงผลสรุปยอดและคะแนนที่ได้รับ"""
        self._clear()
        self.page = "result"
        self.draw_environment()

        self.round_rect(180, 60, 844, 540, 36, fill=COLORS["cream"], outline="", tags="content")

        if success:
            self.canvas.create_oval(462, 90, 562, 190, fill=COLORS["mint"], outline="")
            self.canvas.create_text(512, 140, text="✓", fill=COLORS["forest"], font=(FONT, 56, "bold"))
            self.canvas.create_text(512, 220, text="บันทึกข้อมูลสำเร็จ!", fill=COLORS["forest"], font=(FONT, 28, "bold"))
        else:
            self.canvas.create_oval(462, 90, 562, 190, fill=COLORS["lime"], outline="")
            self.canvas.create_text(512, 140, text="💾", font=("Segoe UI Emoji", 48))
            self.canvas.create_text(512, 220, text="บันทึกข้อมูลออฟไลน์แล้ว", fill=COLORS["forest"], font=(FONT, 28, "bold"))

        # สถิติสรุป (Stats Card)
        self.round_rect(240, 255, 784, 435, 20, fill="white", outline="#DDE6DF", width=1)
        stats = [
            ("จำนวนขยะที่คัดแยก", f"{total_items} ชิ้น"),
            ("ปริมาตรรวมโดยประมาณ", f"{total_ml:.0f} ml"),
            ("คะแนนสะสมที่ได้รับ", f"+{total_score:.1f} pt"),
        ]
        for i, (label, val) in enumerate(stats):
            y = 290 + i * 50
            self.canvas.create_text(275, y, anchor="w", text=label, fill=COLORS["muted"], font=(FONT, 14, "bold"))
            self.canvas.create_text(
                750, y, anchor="e", text=val,
                fill=COLORS["green"] if i == 2 else COLORS["ink"],
                font=(FONT, 16 if i < 2 else 20, "bold")
            )

        self.canvas.create_text(512, 470, text="ขอบคุณที่ร่วมเป็นส่วนหนึ่งในการรักษ์โลก 🌱", fill=COLORS["forest"], font=(FONT, 14, "bold"))

        # บันทึกคะแนนลงประวัติรายการล่าสุด (ถ้ามีเบอร์โทรศัพท์)
        if self.phone:
            records = self.read_history()
            if records and records[0].get("phone") == self.phone:
                records[0]["points"] = total_score
                try:
                    self.history_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
                except Exception:
                    pass

        # กลับไปหน้าจอ Idle Sleeping Animation อัตโนมัติหลังจาก 5 วินาที (หรือแตะหน้าจอเพื่อกลับทันที)
        self.canvas.tag_bind("content", "<Button-1>", lambda e: self.show_idle())
        self._result_timer = self.root.after(5000, self.show_idle)

    # ============================================================
    # UTILITIES & EVENT HANDLERS
    # ============================================================
    def schedule(self, func, *args):
        """เรียกฟังก์ชันใน Thread ของ GUI อย่างปลอดภัย (Thread-safe)"""
        self.root.after(0, lambda: func(*args))

    def run(self):
        """เริ่ม GUI mainloop"""
        self.root.mainloop()

    def quit(self):
        self._stop_animation()
        self.root.quit()

    def _apply_cursor(self):
        try:
            cur = "none" if self.cursor_hidden else ""
            self.root.config(cursor=cur)
            self.canvas.config(cursor=cur)
        except Exception:
            pass

    def _handle_finish(self):
        """จัดการเมื่อผู้ใช้กดปุ่มเสร็จสิ้น"""
        if self.on_finish and callable(self.on_finish):
            try:
                self.on_finish()
            except Exception as e:
                logger.error(f"Error executing on_finish: {e}")
                self._fallback_show_result()
        else:
            self._fallback_show_result()

    def _fallback_show_result(self):
        """แสดงผลสรุปเมื่อไม่มี Controller เชื่อมต่อ"""
        total_items = len(self.items_list) if self.items_list else 2
        total_ml = sum(x["ml"] for x in self.items_list) if self.items_list else 650
        total_score = sum(x["score"] for x in self.items_list) if self.items_list else 4.0
        self.show_result(total_items, total_ml, total_score, True)

    def _test_add_sample_item(self):
        """จำลองการหยอดขยะสำหรับทดสอบ GUI"""
        samples = [
            ("PLASTIC_BOTTLE", 500, 2.0),
            ("ALUMINUM_CAN", 330, 1.5),
            ("PLASTIC_BOTTLE", 600, 2.5),
            ("BEVERAGE_CARTON", 250, 1.0)
        ]
        item_type, ml, score = random.choice(samples)
        self.add_detected_item(item_type, ml, score)

    def _on_key_press(self, event):
        """จัดการการกดปุ่มคีย์บอร์ดตามหน้าปัจจุบัน"""
        if self.page == "phone":
            if event.char and event.char in "0123456789":
                self.add_digit(event.char)
            elif event.keysym in ("BackSpace", "Delete"):
                self.backspace()
            elif event.keysym in ("Return", "KP_Enter"):
                self.confirm_phone(is_guest=False)
        elif self.page == "detecting":
            if event.keysym == "space" or event.char == "a":
                self._test_add_sample_item()
            elif event.keysym in ("Return", "KP_Enter"):
                self._handle_finish()
        elif self.page == "welcome":
            if event.keysym in ("Return", "KP_Enter", "space"):
                self.show_detecting()
        elif self.page == "result":
            if event.keysym in ("Return", "KP_Enter", "space"):
                self.show_idle()

    def _toggle_cursor(self, _event=None):
        self.cursor_hidden = not self.cursor_hidden
        self._apply_cursor()

    def _on_window_configure(self, event):
        if event.widget == self.root:
            if abs(event.width - self.width) > 30 or abs(event.height - self.height) > 30:
                self._recalculate_scale()
                self._refresh_current_page()

    def _toggle_fullscreen(self, _event=None):
        is_fs = bool(self.root.attributes("-fullscreen"))
        self.root.attributes("-fullscreen", not is_fs)
        self.root.update_idletasks()
        self._recalculate_scale()
        self._refresh_current_page()

    def _refresh_current_page(self):
        """วาดหน้าปัจจุบันใหม่เมื่อปรับขนาดจอหรือสลับ Fullscreen"""
        if self.page == "idle":
            self.show_idle()
        elif self.page == "phone":
            self.show_phone_input()
        elif self.page == "welcome":
            self.show_welcome("Guest" if not self.phone else self.phone)
        elif self.page == "detecting":
            self.show_detecting()
        elif self.page == "result":
            self.show_result(
                len(self.items_list) if self.items_list else 2,
                sum(x["ml"] for x in self.items_list) if self.items_list else 650,
                sum(x["score"] for x in self.items_list) if self.items_list else 4.0,
                True
            )
        elif self.page == "history":
            self.show_history()

    def _on_escape(self, _event=None):
        if self.page == "phone":
            self.show_idle()
        elif self.page == "history":
            self.show_phone_input()
        elif self.page in ("welcome", "detecting", "result"):
            self.show_idle()
        else:
            self._toggle_fullscreen()



# ============================================================
# Standalone Runner for Testing
# ============================================================
if __name__ == "__main__":
    print("==================================================")
    print(" Starting SBAY Eco-Tech SmartBinGUI...")
    print(" - Press ESC to go back or toggle fullscreen")
    print(" - Press F11 to toggle fullscreen")
    print(" - Press 'c' to toggle mouse cursor visibility")
    print(" - Tap screen to wake up sleeping animation")
    print(" - Tap Guest Mode or Enter Phone to start session")
    print(" - In Detecting screen: click Camera or press Space to simulate adding waste")
    print(" - Click Finish button to see Result screen")
    print("==================================================")

    def test_phone_submit(phone):
        name = "Guest" if not phone else phone
        print(f"[TEST] Phone submitted: {phone} -> Showing Welcome screen for {name}")
        app.show_welcome(name)

    def test_finish():
        print("[TEST] Session finished -> Showing Result screen")
        total_items = len(app.items_list) if app.items_list else 2
        total_ml = sum(x["ml"] for x in app.items_list) if app.items_list else 650
        total_score = sum(x["score"] for x in app.items_list) if app.items_list else 4.0
        app.show_result(total_items, total_ml, total_score, True)

    app = SmartBinGUI(
        on_phone_submit=test_phone_submit,
        on_finish=test_finish
    )
    app.run()

