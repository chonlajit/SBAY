#!/usr/bin/env python3
# ============================
# SBAY Smart Bin - GUI Test Mode
# ไม่ใช้ AI Detection / ไม่ใช้กล้อง
# กดเลือกชนิดขยะ + ขนาด ml เอง
# ============================

import tkinter as tk
from tkinter import font as tkfont
import threading
import time
import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import DEVICE_ID, WASTE_LABELS
from api_client import ApiClient
from heartbeat_service import HeartbeatService
from session_manager import SessionManager
from scoring.calculator import ScoreCalculator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("gui_test")


class SmartBinTestGUI:
    """
    GUI Test Mode - Flow:
    IDLE -> PHONE INPUT -> WELCOME -> MANUAL SELECT (type+ml) -> RESULT -> IDLE
    """

    def __init__(self):
        # Services
        self.api_client = ApiClient()
        self.session = SessionManager()
        self.calculator = ScoreCalculator()
        self.heartbeat = HeartbeatService(self.api_client, DEVICE_ID)
        self.heartbeat.start()

        # Root window
        self.root = tk.Tk()
        self.root.title("SBAY Smart Bin - Test Mode")
        self.root.geometry("800x480")
        self.root.configure(bg="#0f172a")
        self.root.resizable(True, True)

        # Colors
        self.BG = "#0f172a"
        self.BG_CARD = "#1e293b"
        self.BG_HOVER = "#334155"
        self.GREEN = "#22c55e"
        self.GREEN_DARK = "#16a34a"
        self.EMERALD = "#10b981"
        self.YELLOW = "#eab308"
        self.WHITE = "#f8fafc"
        self.GRAY = "#94a3b8"
        self.GRAY_DARK = "#64748b"
        self.RED = "#ef4444"
        self.BLUE = "#3b82f6"
        self.PURPLE = "#a855f7"
        self.ORANGE = "#f97316"
        self.CYAN = "#06b6d4"

        # Type colors
        self.TYPE_COLORS = {
            "CLEAR_BOTTLE":   self.CYAN,
            "OPAQUE_BOTTLE":  self.PURPLE,
            "GLASSES_BOTTLE": self.ORANGE,
            "STEEL_CAN":      self.GRAY_DARK,
            "ALUMINUM_CAN":   self.YELLOW,
        }

        # Size options
        self.SIZE_OPTIONS = [150, 200, 250, 300, 500, 600, 750, 1000, 1500]

        # Container
        self.container = tk.Frame(self.root, bg=self.BG)
        self.container.pack(fill="both", expand=True)

        # State
        self.phone_var = tk.StringVar(value="")
        self.selected_type = None

        # Start
        self.show_idle()

    # ============================================================
    # SCREEN 1: IDLE
    # ============================================================
    def show_idle(self):
        self._clear()

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.5, anchor="center")

        # Recycle icon (ASCII art style)
        icon_frame = tk.Frame(frame, bg=self.GREEN, width=80, height=80)
        icon_frame.pack()
        icon_frame.pack_propagate(False)
        tk.Label(icon_frame, text="SB", font=("Helvetica", 30, "bold"),
                 fg=self.WHITE, bg=self.GREEN).place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(frame, text="SBAY Smart Bin",
                 font=("Helvetica", 32, "bold"), fg=self.WHITE, bg=self.BG
                 ).pack(pady=(15, 5))

        tk.Label(frame, text="[ TEST MODE ]",
                 font=("Helvetica", 14, "bold"), fg=self.YELLOW, bg=self.BG
                 ).pack(pady=(0, 10))

        tk.Label(frame, text="Device: " + DEVICE_ID,
                 font=("Helvetica", 11), fg=self.GRAY_DARK, bg=self.BG
                 ).pack(pady=(0, 25))

        start_btn = tk.Button(
            frame, text="TAP TO START",
            font=("Helvetica", 18, "bold"),
            fg=self.WHITE, bg=self.GREEN, activebackground=self.GREEN_DARK,
            activeforeground=self.WHITE, relief="flat", bd=0,
            padx=40, pady=15, cursor="hand2",
            command=self.show_phone_input
        )
        start_btn.pack()

        # Queued count
        queued = self.api_client.get_queued_count()
        if queued > 0:
            tk.Label(frame, text=f"Offline queue: {queued} pending",
                     font=("Helvetica", 10), fg=self.ORANGE, bg=self.BG
                     ).pack(pady=(15, 0))

    # ============================================================
    # SCREEN 2: PHONE INPUT
    # ============================================================
    def show_phone_input(self):
        self._clear()
        self.phone_var.set("")

        # Header
        header = tk.Frame(self.container, bg=self.BG_CARD, height=50)
        header.pack(fill="x")
        header.pack_propagate(False)
        tk.Button(header, text="< Back", font=("Helvetica", 12),
                  fg=self.GRAY, bg=self.BG_CARD, relief="flat", bd=0,
                  command=self.show_idle).pack(side="left", padx=15, pady=10)

        # Content
        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.48, anchor="center")

        tk.Label(frame, text="Enter Phone Number",
                 font=("Helvetica", 20, "bold"), fg=self.WHITE, bg=self.BG
                 ).pack(pady=(0, 15))

        # Phone display
        display_frame = tk.Frame(frame, bg=self.BG_CARD, padx=20, pady=12)
        display_frame.pack(pady=(0, 12))

        self.phone_display = tk.Label(
            display_frame, textvariable=self.phone_var,
            font=("Courier", 28, "bold"), fg=self.GREEN, bg=self.BG_CARD,
            width=12, anchor="center"
        )
        self.phone_display.pack()

        # Keypad
        keypad = tk.Frame(frame, bg=self.BG)
        keypad.pack()

        buttons = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['C', '0', 'OK'],
        ]

        for row_data in buttons:
            row = tk.Frame(keypad, bg=self.BG)
            row.pack()
            for key in row_data:
                if key == 'OK':
                    bg, fg = self.GREEN, self.WHITE
                elif key == 'C':
                    bg, fg = self.RED, self.WHITE
                else:
                    bg, fg = self.BG_CARD, self.WHITE

                tk.Button(
                    row, text=key, font=("Helvetica", 18, "bold"),
                    width=5, height=2, bg=bg, fg=fg,
                    activebackground=self.BG_HOVER, activeforeground=self.WHITE,
                    relief="flat", bd=0,
                    command=lambda k=key: self._keypad_press(k)
                ).pack(side="left", padx=2, pady=2)

        # Guest button
        tk.Button(frame, text="Continue as Guest",
                  font=("Helvetica", 11), fg=self.GRAY, bg=self.BG,
                  relief="flat", bd=0, cursor="hand2",
                  command=lambda: self._submit_phone(None)
                  ).pack(pady=(12, 0))

    def _keypad_press(self, key):
        current = self.phone_var.get()
        if key == 'C':
            self.phone_var.set(current[:-1])
        elif key == 'OK':
            if len(current) >= 9:
                self._submit_phone(current)
        else:
            if len(current) < 10:
                self.phone_var.set(current + key)

    def _submit_phone(self, phone):
        if phone:
            logger.info(f"Looking up phone: {phone}")
            user = self.api_client.get_user_by_phone(phone)
        else:
            user = None

        if user:
            uid = user.get('id', '')
            name = f"{user.get('title', '')} {user.get('firstName', '')} {user.get('lastName', '')}".strip()
        else:
            uid = ""
            name = "Guest"

        self.session.start(DEVICE_ID, uid, name)
        self.show_welcome(name)

    # ============================================================
    # SCREEN 3: WELCOME
    # ============================================================
    def show_welcome(self, name):
        self._clear()

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.45, anchor="center")

        # Avatar circle
        avatar = tk.Frame(frame, bg=self.GREEN, width=70, height=70)
        avatar.pack()
        avatar.pack_propagate(False)
        initial = name[0].upper() if name else "G"
        tk.Label(avatar, text=initial, font=("Helvetica", 28, "bold"),
                 fg=self.WHITE, bg=self.GREEN).place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(frame, text=f"Welcome!",
                 font=("Helvetica", 24, "bold"), fg=self.WHITE, bg=self.BG
                 ).pack(pady=(15, 3))

        tk.Label(frame, text=name,
                 font=("Helvetica", 18), fg=self.GREEN, bg=self.BG
                 ).pack(pady=(0, 10))

        tk.Label(frame, text="Starting session...",
                 font=("Helvetica", 12), fg=self.GRAY, bg=self.BG
                 ).pack()

        self.root.after(1500, self.show_select_type)

    # ============================================================
    # SCREEN 4: SELECT WASTE TYPE
    # ============================================================
    def show_select_type(self):
        self._clear()

        # Top bar with session info
        top = tk.Frame(self.container, bg=self.GREEN_DARK, height=45)
        top.pack(fill="x")
        top.pack_propagate(False)

        tk.Label(top, text=f"Session: {self.session.user_name}",
                 font=("Helvetica", 12, "bold"), fg=self.WHITE, bg=self.GREEN_DARK
                 ).pack(side="left", padx=15, pady=8)

        summary = self.session.get_summary()
        tk.Label(top, text=f"{summary['totalItems']} items | +{summary['totalScore']:.1f} pt",
                 font=("Helvetica", 12, "bold"), fg=self.YELLOW, bg=self.GREEN_DARK
                 ).pack(side="right", padx=15, pady=8)

        # Main area
        main = tk.Frame(self.container, bg=self.BG)
        main.pack(fill="both", expand=True, padx=15, pady=10)

        tk.Label(main, text="Select Waste Type",
                 font=("Helvetica", 16, "bold"), fg=self.WHITE, bg=self.BG
                 ).pack(pady=(5, 10))

        # Type buttons grid
        grid = tk.Frame(main, bg=self.BG)
        grid.pack(fill="both", expand=True)

        types = list(WASTE_LABELS.items())

        # 2 columns, 3 rows
        for i, (type_key, label_th) in enumerate(types):
            row = i // 2
            col = i % 2

            color = self.TYPE_COLORS.get(type_key, self.BLUE)

            btn_frame = tk.Frame(grid, bg=color, padx=3, pady=3)
            btn_frame.grid(row=row, column=col, padx=6, pady=6, sticky="nsew")

            inner = tk.Frame(btn_frame, bg=self.BG_CARD, padx=15, pady=12)
            inner.pack(fill="both", expand=True)

            tk.Label(inner, text=label_th,
                     font=("Helvetica", 13, "bold"), fg=self.WHITE, bg=self.BG_CARD
                     ).pack(anchor="w")

            tk.Label(inner, text=type_key,
                     font=("Helvetica", 9), fg=self.GRAY, bg=self.BG_CARD
                     ).pack(anchor="w")

            # Make entire frame clickable
            for widget in [btn_frame, inner] + inner.winfo_children():
                widget.bind("<Button-1>", lambda e, t=type_key: self._on_type_select(t))
                widget.configure(cursor="hand2")

        # Make grid expand
        grid.columnconfigure(0, weight=1)
        grid.columnconfigure(1, weight=1)
        for r in range(3):
            grid.rowconfigure(r, weight=1)

        # Bottom: items list + finish button
        bottom = tk.Frame(self.container, bg=self.BG_CARD)
        bottom.pack(fill="x", side="bottom")

        # Recent items (scrollable)
        if self.session.has_items():
            items_frame = tk.Frame(bottom, bg=self.BG_CARD)
            items_frame.pack(fill="x", padx=10, pady=(8, 0))

            # Show last 3 items
            recent = self.session.items[-3:]
            for item in recent:
                label = WASTE_LABELS.get(item["type"], item["type"])
                tk.Label(items_frame,
                         text=f"  {label} ({item['ml']}ml) +{item['score']:.1f}pt",
                         font=("Helvetica", 10), fg=self.EMERALD, bg=self.BG_CARD,
                         anchor="w"
                         ).pack(fill="x")

        btn_row = tk.Frame(bottom, bg=self.BG_CARD)
        btn_row.pack(fill="x", padx=10, pady=8)

        tk.Button(btn_row, text="FINISH",
                  font=("Helvetica", 16, "bold"),
                  fg=self.WHITE, bg=self.GREEN, activebackground=self.GREEN_DARK,
                  relief="flat", bd=0, padx=25, pady=8, cursor="hand2",
                  command=self._on_finish
                  ).pack(side="right")

        if self.session.has_items():
            s = self.session.get_summary()
            tk.Label(btn_row,
                     text=f"Total: {s['totalItems']} items | {s['totalMl']:.0f}ml | +{s['totalScore']:.1f}pt",
                     font=("Helvetica", 11, "bold"), fg=self.WHITE, bg=self.BG_CARD
                     ).pack(side="left", padx=5)

    def _on_type_select(self, type_key):
        self.selected_type = type_key
        self.show_select_size()

    # ============================================================
    # SCREEN 5: SELECT SIZE (ml)
    # ============================================================
    def show_select_size(self):
        self._clear()

        type_label = WASTE_LABELS.get(self.selected_type, self.selected_type)
        type_color = self.TYPE_COLORS.get(self.selected_type, self.BLUE)

        # Header
        header = tk.Frame(self.container, bg=type_color, height=55)
        header.pack(fill="x")
        header.pack_propagate(False)

        tk.Button(header, text="< Back", font=("Helvetica", 12),
                  fg=self.WHITE, bg=type_color, relief="flat", bd=0,
                  activebackground=type_color, activeforeground=self.WHITE,
                  command=self.show_select_type).pack(side="left", padx=15, pady=10)

        tk.Label(header, text=type_label,
                 font=("Helvetica", 16, "bold"), fg=self.WHITE, bg=type_color
                 ).pack(side="left", padx=5, pady=10)

        # Main
        main = tk.Frame(self.container, bg=self.BG)
        main.pack(fill="both", expand=True, padx=20, pady=15)

        tk.Label(main, text="Select Size (ml)",
                 font=("Helvetica", 18, "bold"), fg=self.WHITE, bg=self.BG
                 ).pack(pady=(5, 15))

        # Size grid: 3 columns
        grid = tk.Frame(main, bg=self.BG)
        grid.pack(fill="both", expand=True)

        for i, ml in enumerate(self.SIZE_OPTIONS):
            row = i // 3
            col = i % 3

            btn = tk.Button(
                grid, text=f"{ml}\nml",
                font=("Helvetica", 16, "bold"),
                width=7, height=3,
                fg=self.WHITE, bg=self.BG_CARD,
                activebackground=type_color, activeforeground=self.WHITE,
                relief="flat", bd=0, cursor="hand2",
                command=lambda m=ml: self._on_size_select(m)
            )
            btn.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")

        for c in range(3):
            grid.columnconfigure(c, weight=1)
        for r in range(3):
            grid.rowconfigure(r, weight=1)

    def _on_size_select(self, ml):
        # Calculate score
        result = self.calculator.calculate(self.selected_type, ml)

        # Add to session
        self.session.add_item(
            self.selected_type, ml,
            result["weight"], result["score"]
        )

        type_label = WASTE_LABELS.get(self.selected_type, self.selected_type)
        logger.info(f"Added: {type_label} {ml}ml score={result['score']}")

        # Show confirmation briefly, then go back to type select
        self.show_item_confirmed(type_label, ml, result["score"])

    # ============================================================
    # SCREEN 5.5: ITEM CONFIRMED (flash)
    # ============================================================
    def show_item_confirmed(self, label, ml, score):
        self._clear()

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.45, anchor="center")

        # Checkmark circle
        check = tk.Frame(frame, bg=self.GREEN, width=80, height=80)
        check.pack()
        check.pack_propagate(False)
        tk.Label(check, text="OK", font=("Helvetica", 28, "bold"),
                 fg=self.WHITE, bg=self.GREEN).place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(frame, text="Item Added!",
                 font=("Helvetica", 22, "bold"), fg=self.GREEN, bg=self.BG
                 ).pack(pady=(15, 10))

        # Info card
        card = tk.Frame(frame, bg=self.BG_CARD, padx=30, pady=15)
        card.pack()

        tk.Label(card, text=label,
                 font=("Helvetica", 16, "bold"), fg=self.WHITE, bg=self.BG_CARD
                 ).pack()
        tk.Label(card, text=f"{ml} ml",
                 font=("Helvetica", 20, "bold"), fg=self.CYAN, bg=self.BG_CARD
                 ).pack(pady=(5, 0))
        tk.Label(card, text=f"+{score:.1f} points",
                 font=("Helvetica", 16, "bold"), fg=self.YELLOW, bg=self.BG_CARD
                 ).pack(pady=(3, 0))

        summary = self.session.get_summary()
        tk.Label(frame, text=f"Session total: {summary['totalItems']} items | +{summary['totalScore']:.1f} pt",
                 font=("Helvetica", 12), fg=self.GRAY, bg=self.BG
                 ).pack(pady=(15, 0))

        # Auto go back to type select after 1 second
        self.root.after(1000, self.show_select_type)

    # ============================================================
    # SCREEN 6: FINISH → SEND
    # ============================================================
    def _on_finish(self):
        if not self.session.has_items():
            self.show_idle()
            return

        self._show_sending()
        threading.Thread(target=self._send_session, daemon=True).start()

    def _show_sending(self):
        self._clear()

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.45, anchor="center")

        # Spinner circle
        spinner = tk.Frame(frame, bg=self.YELLOW, width=70, height=70)
        spinner.pack()
        spinner.pack_propagate(False)
        tk.Label(spinner, text="...", font=("Helvetica", 24, "bold"),
                 fg=self.BG, bg=self.YELLOW).place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(frame, text="Sending Data...",
                 font=("Helvetica", 22, "bold"), fg=self.YELLOW, bg=self.BG
                 ).pack(pady=(15, 5))

        tk.Label(frame, text="Please wait",
                 font=("Helvetica", 13), fg=self.GRAY, bg=self.BG
                 ).pack()

    def _send_session(self):
        summary = self.session.get_summary()
        payload = self.session.to_payload()

        logger.info(f"Sending: {summary}")
        success = self.api_client.post_session(payload)

        # Show result on GUI thread
        self.root.after(0, self.show_result, summary, success)

    # ============================================================
    # SCREEN 7: RESULT
    # ============================================================
    def show_result(self, summary, success):
        self._clear()

        frame = tk.Frame(self.container, bg=self.BG)
        frame.place(relx=0.5, rely=0.45, anchor="center")

        if success:
            icon_bg = self.GREEN
            icon_text = "OK"
            title = "Sent Successfully!"
            title_color = self.GREEN
            subtitle = ""
        else:
            icon_bg = self.ORANGE
            icon_text = "Q"
            title = "Saved to Queue"
            title_color = self.ORANGE
            subtitle = "Will retry automatically when online"

        # Icon
        icon = tk.Frame(frame, bg=icon_bg, width=80, height=80)
        icon.pack()
        icon.pack_propagate(False)
        tk.Label(icon, text=icon_text, font=("Helvetica", 28, "bold"),
                 fg=self.WHITE, bg=icon_bg).place(relx=0.5, rely=0.5, anchor="center")

        tk.Label(frame, text=title,
                 font=("Helvetica", 24, "bold"), fg=title_color, bg=self.BG
                 ).pack(pady=(15, 3))

        if subtitle:
            tk.Label(frame, text=subtitle,
                     font=("Helvetica", 11), fg=self.GRAY, bg=self.BG
                     ).pack(pady=(0, 10))

        # Stats card
        card = tk.Frame(frame, bg=self.BG_CARD, padx=40, pady=20)
        card.pack(pady=15)

        stats = [
            ("Items", f"{summary['totalItems']}"),
            ("Volume", f"{summary['totalMl']:.0f} ml"),
            ("Points", f"+{summary['totalScore']:.1f}"),
        ]

        for label, value in stats:
            row = tk.Frame(card, bg=self.BG_CARD)
            row.pack(fill="x", pady=4)
            tk.Label(row, text=label, font=("Helvetica", 14),
                     fg=self.GRAY, bg=self.BG_CARD, width=10, anchor="w"
                     ).pack(side="left")
            tk.Label(row, text=value, font=("Helvetica", 18, "bold"),
                     fg=self.GREEN, bg=self.BG_CARD, anchor="e"
                     ).pack(side="right")

        tk.Label(frame, text="Thank you for recycling!",
                 font=("Helvetica", 13), fg=self.GRAY, bg=self.BG
                 ).pack(pady=(10, 0))

        # Reset session
        self.session.reset()

        # Auto return to idle
        self.root.after(5000, self.show_idle)

    # ============================================================
    # Utilities
    # ============================================================
    def _clear(self):
        for w in self.container.winfo_children():
            w.destroy()

    def run(self):
        logger.info("=" * 50)
        logger.info("  SBAY Smart Bin - GUI TEST MODE")
        logger.info(f"  Device: {DEVICE_ID}")
        logger.info("  No AI / No Camera / Manual Input")
        logger.info("=" * 50)
        self.root.mainloop()


# ============================
# Entry Point
# ============================
if __name__ == "__main__":
    app = SmartBinTestGUI()
    app.run()
