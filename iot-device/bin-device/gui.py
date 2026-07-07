# ============================
# SBAY Smart Bin - GUI (Tkinter)
# หน้าจอสัมผัสสำหรับ Raspberry Pi
# ============================

import tkinter as tk
from tkinter import font as tkfont
import threading
import logging
import cv2
from PIL import Image, ImageTk

from config import WASTE_LABELS, USE_IR

logger = logging.getLogger("gui")


class SmartBinGUI:
    """
    GUI สำหรับจอสัมผัส Pi
    States: IDLE → INPUT_PHONE → WELCOME → DETECTING → RESULT → SENDING → IDLE
    """

    def __init__(self, on_phone_submit, on_finish):
        """
        on_phone_submit(phone: str) → callback เมื่อผู้ใช้กรอกเบอร์เสร็จ
        on_finish() → callback เมื่อผู้ใช้กดเสร็จสิ้น
        """
        self.on_phone_submit = on_phone_submit
        self.on_finish = on_finish

        self.root = tk.Tk()
        self.root.title("SBAY Smart Bin")
        self.root.geometry("1280x800")  # Expanded resolution for larger screens
        self.root.configure(bg="#0f172a")

        # Try fullscreen on Pi
        try:
            self.root.attributes("-fullscreen", True)
        except:
            pass

        # Fonts
        self.font_title = tkfont.Font(family="Helvetica", size=42, weight="bold")
        self.font_large = tkfont.Font(family="Helvetica", size=32, weight="bold")
        self.font_medium = tkfont.Font(family="Helvetica", size=24)
        self.font_small = tkfont.Font(family="Helvetica", size=18)
        self.font_keypad = tkfont.Font(family="Helvetica", size=32, weight="bold")

        # Colors
        self.BG = "#0f172a"
        self.BG_CARD = "#1e293b"
        self.GREEN = "#22c55e"
        self.GREEN_DARK = "#16a34a"
        self.YELLOW = "#eab308"
        self.WHITE = "#f8fafc"
        self.GRAY = "#94a3b8"
        self.RED = "#ef4444"

        # Main container
        self.container = tk.Frame(self.root, bg=self.BG)
        self.container.pack(fill="both", expand=True)

        # State
        self.phone_var = tk.StringVar(value="")
        self.items_list = []

        # Start at idle
        self.show_idle()

    # ==============================
    # SCREEN: IDLE - รอผู้ใช้
    # ==============================
    def show_idle(self):
        self._clear()

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.5, anchor="center")

        # Logo / Icon
        tk.Label(frame, text="♻️", font=("Segoe UI Emoji", 100), bg=self.BG).pack()

        tk.Label(
            frame, text="SBAY Smart Bin",
            font=self.font_title, fg=self.GREEN, bg=self.BG
        ).pack(pady=(10, 5))

        tk.Label(
            frame, text="แตะหน้าจอเพื่อเริ่มต้น",
            font=self.font_medium, fg=self.GRAY, bg=self.BG
        ).pack(pady=5)

        # Tap anywhere to start
        self.root.bind("<Button-1>", lambda e: self.show_phone_input())

    # ==============================
    # SCREEN: INPUT PHONE - กรอกเบอร์โทร
    # ==============================
    def show_phone_input(self):
        self._clear()
        self.root.unbind("<Button-1>")
        self.phone_var.set("")

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(
            frame, text="กรุณากรอกเบอร์โทรศัพท์",
            font=self.font_large, fg=self.WHITE, bg=self.BG
        ).pack(pady=(0, 15))

        # Phone display
        self.phone_display = tk.Label(
            frame, textvariable=self.phone_var,
            font=tkfont.Font(family="Courier", size=48, weight="bold"),
            fg=self.GREEN, bg=self.BG_CARD,
            width=15, relief="flat", pady=10
        )
        self.phone_display.pack(pady=(0, 15))

        # Keypad
        keypad_frame = tk.Frame(frame, bg=self.BG)
        keypad_frame.pack()

        buttons = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['⌫', '0', '✓'],
        ]

        for row in buttons:
            row_frame = tk.Frame(keypad_frame, bg=self.BG)
            row_frame.pack()
            for key in row:
                if key == '✓':
                    bg, fg = self.GREEN, self.WHITE
                elif key == '⌫':
                    bg, fg = self.RED, self.WHITE
                else:
                    bg, fg = self.BG_CARD, self.WHITE

                btn = tk.Button(
                    row_frame, text=key, font=self.font_keypad,
                    width=5, height=2, bg=bg, fg=fg,
                    activebackground=self.GREEN_DARK, activeforeground=self.WHITE,
                    relief="flat", bd=0,
                    command=lambda k=key: self._keypad_press(k)
                )
                btn.pack(side="left", padx=3, pady=3)

        # Skip button
        tk.Button(
            frame, text="ข้ามขั้นตอน (Guest)", font=self.font_small,
            bg=self.BG, fg=self.GRAY, relief="flat", bd=0,
            command=lambda: self.on_phone_submit(None)
        ).pack(pady=(15, 0))

    def _keypad_press(self, key):
        current = self.phone_var.get()
        if key == '⌫':
            self.phone_var.set(current[:-1])
        elif key == '✓':
            if len(current) >= 9:
                self.on_phone_submit(current)
            else:
                self._flash_error("กรุณากรอกเบอร์ให้ครบ")
        else:
            if len(current) < 10:
                self.phone_var.set(current + key)

    def _flash_error(self, msg):
        """แสดงข้อความ error ชั่วคราว"""
        self.phone_display.config(fg=self.RED)
        self.root.after(500, lambda: self.phone_display.config(fg=self.GREEN))

    # ==============================
    # SCREEN: WELCOME - แสดงชื่อผู้ใช้
    # ==============================
    def show_welcome(self, name):
        self._clear()
        self.items_list = []

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(
            frame, text="👋", font=("Segoe UI Emoji", 80), bg=self.BG
        ).pack()

        tk.Label(
            frame, text=f"สวัสดี {name}",
            font=self.font_title, fg=self.GREEN, bg=self.BG
        ).pack(pady=(10, 5))

        tk.Label(
            frame, text="กรุณาหยอดขยะลงในตู้",
            font=self.font_medium, fg=self.GRAY, bg=self.BG
        ).pack(pady=5)

        # Auto transition to detecting screen after 2 seconds
        self.root.after(2000, self.show_detecting)

    # ==============================
    # SCREEN: DETECTING - กำลังตรวจจับขยะ
    # ==============================
    def show_detecting(self):
        self._clear()

        # Top bar
        top = tk.Frame(self.container, bg=self.GREEN_DARK, height=80)
        top.pack(fill="x")
        top.pack_propagate(False)

        tk.Label(
            top, text="🔍  กำลังตรวจจับขยะ...",
            font=self.font_medium, fg=self.WHITE, bg=self.GREEN_DARK
        ).pack(side="left", padx=15, pady=10)

        # Item count
        self.item_count_label = tk.Label(
            top, text="0 ชิ้น", font=self.font_medium, fg=self.YELLOW, bg=self.GREEN_DARK
        )
        self.item_count_label.pack(side="right", padx=15, pady=10)

        # Items list area
        mid = tk.Frame(self.container, bg=self.BG)
        mid.pack(fill="both", expand=True, padx=15, pady=10)

        left_mid = tk.Frame(mid, bg=self.BG)
        left_mid.pack(side="left", fill="both", expand=True)
        left_mid.pack_propagate(False)

        right_mid = tk.Frame(mid, bg=self.BG)
        right_mid.pack(side="right", fill="both", expand=True)
        right_mid.pack_propagate(False)

        # Camera frame (Now on right)
        self.camera_label = tk.Label(right_mid, bg=self.BG_CARD)
        self.camera_label.pack(expand=True, fill="both", padx=10)

        # Scrollable list (Now on left)
        self.items_canvas = tk.Canvas(left_mid, bg=self.BG, highlightthickness=0, yscrollincrement=1)
        self.items_canvas.pack(fill="both", expand=True)

        self.items_inner = tk.Frame(self.items_canvas, bg=self.BG)
        self.items_window = self.items_canvas.create_window((0, 0), window=self.items_inner, anchor="nw")

        # ผูก Event เพื่อให้ Canvas รู้จักขนาดที่เปลี่ยนไปของ Frame ด้านใน (เพื่อให้ Scroll ได้)
        self.items_inner.bind(
            "<Configure>",
            lambda e: self.items_canvas.configure(scrollregion=self.items_canvas.bbox("all"))
        )
        
        # บังคับให้ Frame ด้านในขยายเต็มความกว้างของ Canvas ตลอดเวลา
        self.items_canvas.bind(
            "<Configure>",
            lambda e: self.items_canvas.itemconfig(self.items_window, width=e.width)
        )

        # เพิ่มระบบทัชสกรีนสไลด์เลื่อนขึ้นลง (Touch Scroll)
        self._drag_start_y = 0
        self._bind_touch_scroll(self.items_canvas)
        self._bind_touch_scroll(self.items_inner)

        # Status label
        status_msg = "สแตนด์บาย: รอการหยอดขยะ (เซ็นเซอร์อินฟาเรด)" if USE_IR else "สแตนด์บาย: รอการหยอดขยะ (กล้องทำงานตลอด)"
        self.status_label = tk.Label(
            left_mid, text=status_msg,
            font=self.font_small, fg=self.GRAY, bg=self.BG
        )
        self.status_label.pack(pady=5)

        # Bottom: Finish button
        bottom = tk.Frame(self.container, bg=self.BG, height=100)
        bottom.pack(fill="x", side="bottom")
        bottom.pack_propagate(False)

        tk.Button(
            bottom, text="✅  เสร็จสิ้น", font=self.font_large,
            bg=self.GREEN, fg=self.WHITE,
            activebackground=self.GREEN_DARK, activeforeground=self.WHITE,
            relief="flat", bd=0, padx=30, pady=10,
            command=self.on_finish
        ).pack(pady=10)

    def add_detected_item(self, item_type, size_ml, score):
        """เพิ่มรายการที่ detect ได้แสดงบนหน้าจอ"""
        self.items_list.append({"type": item_type, "ml": size_ml, "score": score})

        if not hasattr(self, 'items_inner') or not self.items_inner.winfo_exists():
            return

        label_text = WASTE_LABELS.get(item_type, item_type)

        row = tk.Frame(self.items_inner, bg=self.BG_CARD, padx=10, pady=8)
        row.pack(fill="x", pady=3, padx=5)

        tk.Label(
            row, text=f"♻️  {label_text}",
            font=self.font_small, fg=self.WHITE, bg=self.BG_CARD, anchor="w"
        ).pack(side="left")

        # แปลงตัวเลขเป๊ะๆ เป็นช่วง (เช่น 325 -> 320-340) ตามที่ผู้ใช้ต้องการ
        lower_bound = size_ml - (size_ml % 10)
        upper_bound = lower_bound + 20
        size_str = f"{lower_bound}-{upper_bound}"

        tk.Label(
            row, text=f"{size_str}ml  |  +{score:.1f} pt",
            font=self.font_small, fg=self.YELLOW, bg=self.BG_CARD, anchor="e"
        ).pack(side="right")

        # ผูกระบบทัชสกรีนให้กับแถวและข้อความใหม่ที่เพิ่งสร้าง
        self._bind_touch_scroll(row)

        # Update count
        count = len(self.items_list)
        if hasattr(self, 'item_count_label') and self.item_count_label.winfo_exists():
            self.item_count_label.config(text=f"{count} ชิ้น")

        # Update status
        if hasattr(self, 'status_label'):
            self.status_label.config(text=f"ตรวจพบ: {label_text} ({size_ml}ml)", fg=self.GREEN)

        # Scroll to bottom
        self.items_canvas.update_idletasks()
        self.items_canvas.yview_moveto(1.0)

    def update_status(self, text, color=None):
        """อัปเดตข้อความสถานะ"""
        if hasattr(self, 'status_label') and self.status_label.winfo_exists():
            self.status_label.config(text=text, fg=color or self.GRAY)

    def update_camera_frame(self, cv2_frame):
        """อัปเดตภาพจากกล้องบน GUI"""
        try:
            if not hasattr(self, 'camera_label'):
                return
            if not self.camera_label.winfo_exists():
                return
                
            if cv2_frame is not None:
                rgb = cv2.cvtColor(cv2_frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(rgb)
                # ปรับขนาดภาพโดยรักษาสัดส่วน (Aspect Ratio) ให้พอดีกับ label
                label_w = self.camera_label.winfo_width()
                label_h = self.camera_label.winfo_height()
                if label_w > 10 and label_h > 10:
                    img.thumbnail((label_w, label_h), Image.LANCZOS)
                
                imgtk = ImageTk.PhotoImage(image=img)
                self.camera_label.imgtk = imgtk
                self.camera_label.configure(image=imgtk)
            else:
                self.camera_label.configure(image='')
        except Exception as e:
            logger.debug(f"Camera frame update skipped: {e}")

    # ==============================
    # SCREEN: RESULT - สรุปผล
    # ==============================
    def show_result(self, total_items, total_ml, total_score, success=True):
        self._clear()

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.5, anchor="center")

        if success:
            tk.Label(frame, text="✅", font=("Segoe UI Emoji", 80), bg=self.BG).pack()
            tk.Label(
                frame, text="ส่งข้อมูลสำเร็จ!",
                font=self.font_title, fg=self.GREEN, bg=self.BG
            ).pack(pady=(10, 20))
        else:
            tk.Label(frame, text="📡", font=("Segoe UI Emoji", 80), bg=self.BG).pack()
            tk.Label(
                frame, text="เก็บข้อมูลไว้แล้ว",
                font=self.font_title, fg=self.YELLOW, bg=self.BG
            ).pack(pady=(10, 5))
            tk.Label(
                frame, text="จะส่งอัตโนมัติเมื่อเชื่อมต่อได้",
                font=self.font_small, fg=self.GRAY, bg=self.BG
            ).pack(pady=(0, 20))

        # Stats card
        card = tk.Frame(frame, bg=self.BG_CARD, padx=30, pady=20)
        card.pack(pady=10)

        stats = [
            ("จำนวน", f"{total_items} ชิ้น"),
            ("ปริมาตรรวม", f"{total_ml:.0f} ml"),
            ("คะแนนที่ได้", f"+{total_score:.1f} pt"),
        ]

        for label, value in stats:
            row = tk.Frame(card, bg=self.BG_CARD)
            row.pack(fill="x", pady=3)
            tk.Label(row, text=label, font=self.font_medium, fg=self.GRAY, bg=self.BG_CARD, anchor="w", width=15).pack(side="left")
            tk.Label(row, text=value, font=self.font_large, fg=self.GREEN, bg=self.BG_CARD, anchor="e").pack(side="right")

        tk.Label(
            frame, text="ขอบคุณที่ร่วมรีไซเคิล 🌱",
            font=self.font_medium, fg=self.GRAY, bg=self.BG
        ).pack(pady=(20, 0))

        # Auto return to idle after 5 seconds
        self.root.after(5000, self.show_idle)

    # ==============================
    # SCREEN: SENDING - กำลังส่งข้อมูล
    # ==============================
    def show_sending(self):
        self._clear()

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(frame, text="📡", font=("Segoe UI Emoji", 80), bg=self.BG).pack()
        tk.Label(
            frame, text="กำลังส่งข้อมูล...",
            font=self.font_title, fg=self.YELLOW, bg=self.BG
        ).pack(pady=(10, 5))
        tk.Label(
            frame, text="กรุณารอสักครู่",
            font=self.font_medium, fg=self.GRAY, bg=self.BG
        ).pack()

    # ==============================
    # Utilities
    # ==============================
    def _bind_touch_scroll(self, widget):
        """ผูก Event นิ้วลากหน้าจอให้กับ Widget และลูกๆ ทั้งหมด"""
        widget.bind("<ButtonPress-1>", self._scroll_start, add="+")
        widget.bind("<B1-Motion>", self._scroll_drag, add="+")
        widget.bind("<MouseWheel>", self._scroll_mouse, add="+")
        widget.bind("<Button-4>", self._scroll_mouse, add="+")
        widget.bind("<Button-5>", self._scroll_mouse, add="+")
        for child in widget.winfo_children():
            self._bind_touch_scroll(child)

    def _scroll_start(self, event):
        self._drag_start_y = event.y_root

    def _scroll_drag(self, event):
        if hasattr(self, 'items_canvas') and self.items_canvas.winfo_exists():
            delta = self._drag_start_y - event.y_root
            if abs(delta) > 0:
                self.items_canvas.yview_scroll(delta, "units")
                self._drag_start_y = event.y_root

    def _scroll_mouse(self, event):
        if hasattr(self, 'items_canvas') and self.items_canvas.winfo_exists():
            delta_val = getattr(event, 'delta', 0)
            num_val = getattr(event, 'num', 0)
            
            if delta_val != 0:
                # Windows / Mac (delta is usually multiple of 120)
                self.items_canvas.yview_scroll(int(-1 * (delta_val / 120) * 40), "units")
            elif num_val == 4:
                # Linux scroll up
                self.items_canvas.yview_scroll(-40, "units")
            elif num_val == 5:
                # Linux scroll down
                self.items_canvas.yview_scroll(40, "units")

    def _clear(self):
        """ล้างหน้าจอ"""
        for widget in self.container.winfo_children():
            widget.destroy()

    def run(self):
        """เริ่ม GUI main loop"""
        self.root.mainloop()

    def schedule(self, func, *args):
        """เรียก function ใน GUI thread (thread-safe)"""
        self.root.after(0, lambda: func(*args))

    def quit(self):
        self.root.quit()
