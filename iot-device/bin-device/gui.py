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

logger = logging.getLogger("gui")

# กำหนดฟอนต์ตามระบบปฏิบัติการ
FONT = "Segoe UI" if sys.platform.startswith("win") else "DejaVu Sans"

# ขนาดหน้าจอมาตรฐาน Eco-Tech Kiosk (รองรับขยายเต็มจอได้)
WIDTH, HEIGHT = 1024, 600

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
    """

    def __init__(self, on_phone_submit=None, on_finish=None):
        self.on_phone_submit = on_phone_submit
        self.on_finish = on_finish

        self.root = tk.Tk()
        self.root.title("SBAY · Eco-Tech Smart Bin")
        self.root.geometry(f"{WIDTH}x{HEIGHT}")
        self.root.configure(bg=COLORS["deep"])

        # คีย์ลัด
        self.root.bind("<Escape>", self._on_escape)
        self.root.bind("<F11>", self._toggle_fullscreen)
        self.root.bind("<c>", self._toggle_cursor)
        self.root.bind("<C>", self._toggle_cursor)
        self.root.bind("<Key>", self._on_key_press)

        # จัดการเส้นทางบันทึกประวัติ (data/history.json)
        self.history_path = Path(__file__).resolve().parent / "data" / "history.json"
        self.history_path.parent.mkdir(exist_ok=True)

        # ควบคุม Cursor เมาส์
        import settings.config as config
        self.cursor_hidden = getattr(config, "HIDE_CURSOR", False)

        # Canvas หลักสำหรับวาด Eco-tech UI ทั้งหมด
        self.container = tk.Frame(self.root, bg=COLORS["deep"])
        self.container.pack(fill="both", expand=True)

        self.canvas = tk.Canvas(
            self.container, width=WIDTH, height=HEIGHT,
            bg=COLORS["deep"], bd=0, highlightthickness=0
        )
        self.canvas.place(relx=0.5, rely=0.5, anchor="center")

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

        self._apply_cursor()

        # เริ่มต้นที่หน้าจอ IDLE (Sleeping Animation)
        self.show_idle()

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
        return self.canvas.create_polygon(
            self.rounded_points(x1, y1, x2, y2, radius),
            smooth=True, splinesteps=24, **kwargs,
        )

    def gradient(self, top="#174A36", bottom="#0A2B22"):
        tr, tg, tb = self.root.winfo_rgb(top)
        br, bg, bb = self.root.winfo_rgb(bottom)
        for y in range(HEIGHT):
            ratio = y / HEIGHT
            r = int((tr + (br - tr) * ratio) / 256)
            g = int((tg + (bg - tg) * ratio) / 256)
            b = int((tb + (bb - tb) * ratio) / 256)
            self.canvas.create_line(0, y, WIDTH, y, fill=f"#{r:02x}{g:02x}{b:02x}", tags="background")

    def draw_environment(self):
        """วาดพื้นหลัง organic, คลื่นด้านล่าง, ใบไม้ และอนุภาคเคลื่อนไหว"""
        self._stop_animation()
        self.canvas.delete("all")
        self.particles.clear()
        self.gradient()

        # คลื่นด้านล่างแบบ Organic
        self.canvas.create_polygon(
            -30, 505, 100, 465, 250, 520, 410, 485, 575, 530,
            740, 475, 890, 510, 1050, 470, 1050, 630, -30, 630,
            smooth=True, splinesteps=36, fill="#1D6046", outline="", tags="background",
        )
        self.canvas.create_polygon(
            -30, 550, 140, 515, 310, 565, 490, 520, 660, 570,
            830, 525, 1050, 555, 1050, 630, -30, 630,
            smooth=True, splinesteps=36, fill="#247C57", outline="", tags="background",
        )

        # สร้างอนุภาคแสงระยิบระยับลอยละล่อง
        random.seed(12)
        palette = ["#2D6D50", "#3B805D", "#82C958", "#65F0A1", "#62B9D6"]
        for index in range(18):
            size = random.randint(5, 16)
            x = random.randint(0, WIDTH)
            y = random.randint(20, HEIGHT - 50)
            item = self.canvas.create_oval(
                x - size, y - size, x + size, y + size,
                fill=random.choice(palette), outline="", stipple="gray50",
                tags=("ambient", f"particle_{index}"),
            )
            self.particles.append({
                "id": item,
                "dx": random.choice([-0.22, -0.16, 0.15, 0.23]),
                "dy": random.choice([-0.14, -0.09, 0.08]),
                "phase": random.random() * math.tau,
            })

        # ใบไม้ลอยแบบไม่ต้องพึ่งพาไฟล์รูปภาพภายนอก
        for x, y, scale in [(70, 90, 1.0), (915, 80, 0.8), (930, 465, 1.1)]:
            self.canvas.create_line(x, y, x + 48 * scale, y + 70 * scale, fill="#75C762", width=4, tags="ambient")
            for offset in (12, 30, 48):
                self.canvas.create_oval(
                    x + offset * scale - 15 * scale, y + offset * scale - 9 * scale,
                    x + offset * scale + 12 * scale, y + offset * scale + 9 * scale,
                    fill="#8AD66B", outline="", tags="ambient",
                )

        self._start_animation()

    def bind_button(self, tag, command, normal, pressed):
        def _on_click(_e=None):
            try:
                self.canvas.itemconfigure(f"{tag}_surface", fill=pressed)
                self.root.after(80, lambda: self._restore_surface(tag, normal))
            except Exception:
                pass
            if command and callable(command):
                command()

        self.canvas.tag_bind(tag, "<Button-1>", _on_click)
        self.canvas.tag_bind(f"{tag}_surface", "<Button-1>", _on_click)
        self.canvas.tag_bind(tag, "<Enter>", lambda _e: self.canvas.config(cursor="hand2"))
        self.canvas.tag_bind(tag, "<Leave>", lambda _e: self.canvas.config(cursor=""))

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
        self._animate_step()

    def _animate_step(self):
        now = datetime.now().timestamp()
        for p in self.particles:
            try:
                self.canvas.move(p["id"], p["dx"] + math.sin(now * 1.2 + p["phase"]) * 0.08, p["dy"])
                x1, y1, x2, y2 = self.canvas.coords(p["id"])
                if x2 < 0:
                    self.canvas.move(p["id"], WIDTH + 30, 0)
                elif x1 > WIDTH:
                    self.canvas.move(p["id"], -WIDTH - 30, 0)
                if y2 < 0:
                    self.canvas.move(p["id"], 0, HEIGHT + 30)
                elif y1 > HEIGHT:
                    self.canvas.move(p["id"], 0, -HEIGHT - 30)
            except (tk.TclError, ValueError):
                pass
        self.anim_id = self.root.after(33, self._animate_step)

    def _stop_animation(self):
        if self.anim_id:
            try:
                self.root.after_cancel(self.anim_id)
            except Exception:
                pass
            self.anim_id = None

    def _clear(self):
        """ล้างหน้าจอและหยุดแอนิเมชันเดิม"""
        self._stop_animation()
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
            width=WIDTH,
            height=HEIGHT,
            on_wake_complete=self.show_phone_input  # เมื่อสะดุ้งตื่นแล้ว เปิดเข้าสู่หน้ากรอกเบอร์โทรศัพท์ทันที
        )
        self.idle_face.start()

    def show_home(self):
        """เข้าสู่หน้าหลักของระบบ (เปิดหน้ากรอกเบอร์โทรศัพท์โดยตรง)"""
        self.show_phone_input()


    # ============================================================
    # SCREEN 3: PHONE INPUT (Keypad & Identification)
    # ============================================================
    def show_phone_input(self):
        """หน้าจอกรอกเบอร์โทรศัพท์ด้วยแป้นพิมพ์สไตล์ Eco-tech"""
        self._clear()
        self.page = "phone"
        self.phone = ""
        self.draw_environment()

        self.header("STEP 01 · IDENTIFY", "กรอกหมายเลขโทรศัพท์", "ใช้สำหรับสะสมคะแนนและตรวจสอบประวัติ")

        # กล่องข้อมูลเบอร์โทรฝั่งซ้าย
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
            self.cam_container, text="📷 ภาพกล้องวงจรปิด\n(คลิกเพื่อทดสอบหยอดขยะ)",
            bg="#061D17", fg=COLORS["mint"], font=(FONT, 13, "bold"), cursor="hand2"
        )
        self.cam_label.pack(fill="both", expand=True)
        self.canvas.create_window(750, 292, window=self.cam_container, width=410, height=280, tags="content")

        # คลิกที่กรอบกล้องเพื่อจำลองหยอดขยะ (สะดวกในการทดสอบ)
        self.cam_container.bind("<Button-1>", lambda e: self._test_add_sample_item())
        self.cam_label.bind("<Button-1>", lambda e: self._test_add_sample_item())

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

    def _toggle_fullscreen(self, _event=None):
        is_fs = bool(self.root.attributes("-fullscreen"))
        self.root.attributes("-fullscreen", not is_fs)

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

