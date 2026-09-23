# ============================
# SBAY Smart Bin - Idle Sleeping Face Animation
# จัดการ Animation หน้าตากำลังหลับ และสะดุ้งตื่นเมื่อแตะหน้าจอ
# พร้อมแสดงเกจวัดปริมาณขยะ 4 ช่อง (ขวด, กระป๋อง, กล่อง, และปริมาณขยะทั้งหมด)
# ============================

import os
import math
import tkinter as tk
from PIL import Image, ImageDraw, ImageFont, ImageTk

# สีมาตรฐานตามการออกแบบ
BG_COLOR = (255, 255, 255)     # พื้นหลังขาว
GRAY_EYE = (126, 137, 126)     # เปลือกตาสีเทา (#7E897E)
GREEN_EYE = (105, 158, 85)     # ตาสีเขียวข้างใน (#699E55)
Z_COLOR = (82, 128, 66)        # สีตัว Z เขียว (#528042)
BLACK_RIM = (0, 0, 0)          # ขอบตาล่างสีดำ และปาก (#000000)
TEXT_INK = "#173129"           # สีตัวหนังสือเข้ม
TEXT_MUTED = "#6B7C73"         # สีข้อความรอง

# สีสำหรับแถบเกจวัดขยะแต่ละประเภท (3 ประเภทตามภาพ mockup)
GAUGE_COLORS = {
    "PLASTIC_BOTTLE": "#4A5568",   # ขวดพลาสติก: สีเทาเข้ม/ชาร์โคล
    "ALUMINUM_CAN": "#4E7D42",     # กระป๋อง: สีเขียวใบไม้
    "BEVERAGE_CARTON": "#68B4D8",  # กล่องเครื่องดื่ม: สีฟ้าใส
}
TRACK_COLOR = "#E5E7EB"            # สีกระบอกเกจส่วนที่ยังว่าง (เทาอ่อน)


class IdleSleepingFace:
    """
    คลาสควบคุมหน้าจอ Sleep / Idle Screen:
    - ด้านซ้าย: กราฟแท่งบอกปริมาณขยะ 3 ประเภท (ขวด, ป๋อง, กล่อง) พร้อมไอคอน Vector
    - กึ่งกลาง-ขวา: Animation ใบหน้านอนหลับ (Sleeping Face) กรนตัว Z ลอยเบาๆ และสะดุ้งตื่นเมื่อแตะจอ
    - คำสั่งแตะ: "แตะเพื่อเริ่ม"
    """

    def __init__(self, root, container, width=960, height=540, on_wake_complete=None, canvas=None, get_waste_levels=None):
        self.root = root
        self.container = container
        self.width = width
        self.height = height
        self.on_wake_complete = on_wake_complete
        self.get_waste_levels_fn = get_waste_levels

        self.state = "sleeping"  # 'sleeping', 'waking', 'awake', 'stopped'
        self.sleep_frame_idx = 0
        self.timer_id = None
        self.poll_timer = None

        # สเกลขนาดตามความกว้างและความสูงจริงของหน้าจอ
        self.scale = max(0.5, min(self.width / 960.0, self.height / 540.0))

        # ค่าเริ่มต้นระดับความจุขยะ (อ่านจาก Ultrasonic Service จริงทันที)
        self.waste_levels = {
            "PLASTIC_BOTTLE": 0.0,
            "ALUMINUM_CAN": 0.0,
            "BEVERAGE_CARTON": 0.0,
        }
        if self.get_waste_levels_fn and callable(self.get_waste_levels_fn):
            try:
                live_levels = self.get_waste_levels_fn()
                if live_levels:
                    self.waste_levels.update(live_levels)
            except Exception:
                pass

        # การคำนวณตำแหน่ง Layout ฝั่งซ้าย (Waste Gauges) และกึ่งกลาง (Face)
        self.gauge_left_x = int(30 * self.scale)
        self.gauge_header_y = int(26 * self.scale)
        self.bar_w = max(16, int(24 * self.scale))
        self.bar_gap = max(10, int(18 * self.scale))
        self.bar_top_y = int(118 * self.scale)
        self.bar_bottom_y = self.height - int(72 * self.scale)
        self.bar_h = max(40, self.bar_bottom_y - self.bar_top_y)
        self.icon_y = int(76 * self.scale)
        self.gauge_radius = self.bar_w // 2

        # ขอบขวาสุดของโซนกราฟขยะฝั่งซ้าย (3 หลอดตามภาพต้นฉบับ)
        self.gauge_right_x = self.gauge_left_x + 3 * self.bar_w + 2 * self.bar_gap + int(25 * self.scale)

        # จุดกึ่งกลางใบหน้า Mascot ในพื้นที่ที่เหลือทางฝั่งขวา (ซูมใกล้ Close-up)
        self.face_cx = int((self.gauge_right_x + self.width) / 2.0) + int(8 * self.scale)
        self.face_cy = int(self.height * 0.40)
        self.eye_spacing = int(242 * self.scale)
        self.eye_radius = int(138 * self.scale)

        # ขนาดตัวหนังสือ
        self.s_thai_header = max(15, int(22 * self.scale))
        self.s_thai_prompt = max(16, int(26 * self.scale))
        self.s_thai_sub = max(10, int(12 * self.scale))
        self.s_thai_val = max(10, int(12 * self.scale))
        s_z_sm = max(22, int(38 * self.scale))
        s_z_md = max(30, int(56 * self.scale))
        s_z_lg = max(42, int(78 * self.scale))

        # โหลดฟอนต์ตัว Z (ASCII)
        try:
            self.font_z_sm = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", s_z_sm)
            self.font_z_md = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", s_z_md)
            self.font_z_lg = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", s_z_lg)
        except Exception:
            try:
                self.font_z_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s_z_sm)
                self.font_z_md = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s_z_md)
                self.font_z_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s_z_lg)
            except Exception:
                self.font_z_sm = ImageFont.load_default()
                self.font_z_md = ImageFont.load_default()
                self.font_z_lg = ImageFont.load_default()

        # สร้างเฟรมภาพใบหน้าล่วงหน้า (Pre-render) เพื่อประสิทธิภาพสูงสุด 0% CPU
        self.sleep_photo_frames = []
        self.waking_choreography = []
        self._pre_render_frames()

        # Canvas จัดการ
        if canvas is not None:
            self.canvas = canvas
            self.created_canvas = False
            self.canvas.configure(bg="#ffffff")
        else:
            self.canvas = tk.Canvas(
                self.container,
                width=self.width,
                height=self.height,
                bg="#ffffff",
                highlightthickness=0,
                bd=0
            )
            self.canvas.place(relx=0.5, rely=0.5, anchor="center")
            self.created_canvas = True

        self.font_family = self._detect_font_family()

        # วาดภาพ Animation ใบหน้าเริ่มต้น
        self.image_item = self.canvas.create_image(
            self.width // 2, self.height // 2,
            image=self.sleep_photo_frames[0],
            tags="idle_sleeping_face"
        )

        # วาดเกจวัดปริมาณขยะ 4 ช่องฝั่งซ้าย
        self.waste_icons = self._create_waste_icons()
        self.gauge_items = {}
        self._init_waste_gauges()

        # ข้อความคำแนะนำใต้ปาก: "แตะเพื่อเริ่ม"
        create_fn = getattr(self.canvas, "_orig_create_text", self.canvas.create_text)
        mouth_bottom = self.face_cy + int(138 * self.scale) + int(30 * self.scale)
        self.sub_item = create_fn(
            self.face_cx, mouth_bottom + int(45 * self.scale),
            text="แตะเพื่อเริ่ม",
            fill=TEXT_INK,
            font=(self.font_family, self.s_thai_prompt, "bold"),
            tags="idle_sleeping_face"
        )

        # จัดลำดับเลเยอร์ให้ภาพใบหน้าอยู่ด้านหลัง ส่วนข้อความและเกจอยู่ด้านหน้า
        try:
            self.canvas.tag_lower(self.image_item)
            self.canvas.tag_raise("waste_gauge")
            self.canvas.tag_raise(self.sub_item)
        except Exception:
            pass

        # ผูก Event แตะหน้าจอเพื่อสะดุ้งตื่น
        self.canvas.tag_bind("idle_sleeping_face", "<Button-1>", self.on_tap)
        self.canvas.tag_bind("waste_gauge", "<Button-1>", self.on_tap)
        self.canvas.bind("<Button-1>", self.on_tap)

    def _detect_font_family(self):
        import sys
        if sys.platform.startswith("win"):
            return "Segoe UI"
        try:
            import tkinter.font as tkfont
            available = set(tkfont.families(self.root))
            for f in ("Noto Sans Thai", "Loma", "Garuda", "Waree", "Piboto", "DejaVu Sans"):
                if f in available:
                    return f
        except Exception:
            pass
        return "sans-serif"

    # ============================================================
    # WASTE GAUGE RENDERING & UPDATE
    # ============================================================
    def _create_waste_icons(self):
        """โหลดไอคอน Vector ขยะ 3 ประเภท: ขวด, กระป๋อง, กล่อง จาก assets/"""
        scale = self.scale
        target_h = max(24, int(56 * scale))
        target_w = max(18, int(36 * scale))
        icons = {}

        assets_dir = os.path.join(os.path.dirname(__file__), "assets")
        icon_mapping = {
            "PLASTIC_BOTTLE": "gauge_bottle.png",
            "ALUMINUM_CAN": "gauge_can.png",
            "BEVERAGE_CARTON": "gauge_carton.png",
        }

        for cat_key, fname in icon_mapping.items():
            fpath = os.path.join(assets_dir, fname)
            if os.path.exists(fpath):
                try:
                    img = Image.open(fpath).convert("RGBA")
                    orig_w, orig_h = img.size
                    ratio = min(target_w / orig_w, target_h / orig_h)
                    nw = max(1, int(orig_w * ratio))
                    nh = max(1, int(orig_h * ratio))
                    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
                    icons[cat_key] = ImageTk.PhotoImage(resized)
                except Exception as e:
                    print(f"Error loading icon {fpath}: {e}")

        # Fallback สร้างภาพจำลองกรณีไม่มีไฟล์
        iw = target_w
        ih = target_h
        if "PLASTIC_BOTTLE" not in icons:
            im_b = Image.new("RGBA", (iw * 2, ih * 2), (0, 0, 0, 0))
            d_b = ImageDraw.Draw(im_b)
            d_b.rounded_rectangle([24, 4, 36, 14], radius=3, fill=(78, 125, 66, 255))
            d_b.rectangle([27, 14, 33, 20], fill=(215, 222, 228, 255))
            d_b.rounded_rectangle([18, 20, 42, 84], radius=7, fill=(232, 238, 240, 255), outline=(180, 192, 198, 255), width=2)
            d_b.rectangle([18, 44, 42, 62], fill=(78, 125, 66, 255))
            icons["PLASTIC_BOTTLE"] = ImageTk.PhotoImage(im_b.resize((iw, ih), Image.Resampling.LANCZOS))

        if "ALUMINUM_CAN" not in icons:
            im_c = Image.new("RGBA", (iw * 2, ih * 2), (0, 0, 0, 0))
            d_c = ImageDraw.Draw(im_c)
            d_c.rounded_rectangle([16, 20, 44, 82], radius=5, fill=(78, 125, 66, 255))
            d_c.ellipse([16, 12, 44, 26], fill=(205, 210, 215, 255), outline=(165, 170, 175, 255), width=2)
            d_c.ellipse([25, 16, 35, 22], fill=(155, 160, 165, 255))
            d_c.ellipse([16, 74, 44, 84], fill=(175, 180, 185, 255))
            icons["ALUMINUM_CAN"] = ImageTk.PhotoImage(im_c.resize((iw, ih), Image.Resampling.LANCZOS))

        if "BEVERAGE_CARTON" not in icons:
            im_t = Image.new("RGBA", (iw * 2, ih * 2), (0, 0, 0, 0))
            d_t = ImageDraw.Draw(im_t)
            d_t.polygon([(17, 24), (30, 8), (43, 24)], fill=(165, 210, 245, 255))
            d_t.rectangle([28, 4, 32, 10], fill=(120, 175, 225, 255))
            d_t.rounded_rectangle([17, 24, 43, 84], radius=4, fill=(116, 180, 220, 255))
            d_t.rectangle([17, 46, 43, 64], fill=(37, 99, 235, 255))
            icons["BEVERAGE_CARTON"] = ImageTk.PhotoImage(im_t.resize((iw, ih), Image.Resampling.LANCZOS))

        return icons

    def _init_waste_gauges(self):
        """วาดหัวข้อ 'ปริมาณขยะ' และแท่งเกจวัดทั้ง 3 แท่ง (สี่เหลี่ยมผืนผ้าธรรมดา ไม่แหลม ไม่โค้ง)"""
        create_fn_text = getattr(self.canvas, "_orig_create_text", self.canvas.create_text)
        create_fn_img = getattr(self.canvas, "_orig_create_image", self.canvas.create_image)

        # 1. ข้อความ Header: "ปริมาณขยะ"
        self.canvas.create_text(
            self.gauge_left_x + int(4 * self.scale), self.gauge_header_y,
            anchor="w",
            text="ปริมาณขยะ",
            fill=TEXT_INK,
            font=(self.font_family, self.s_thai_header, "bold"),
            tags=("idle_sleeping_face", "waste_gauge")
        )

        # รายการแท่งเกจ 3 แท่งตามภาพต้นฉบับ
        categories = ["PLASTIC_BOTTLE", "ALUMINUM_CAN", "BEVERAGE_CARTON"]

        for idx, cat_key in enumerate(categories):
            bx1 = self.gauge_left_x + idx * (self.bar_w + self.bar_gap)
            bx2 = bx1 + self.bar_w
            bcx = (bx1 + bx2) // 2

            # ไอคอนเหนือแท่ง
            icon_photo = self.waste_icons.get(cat_key)
            if icon_photo:
                create_fn_img(
                    bcx, self.icon_y,
                    image=icon_photo,
                    tags=("idle_sleeping_face", "waste_gauge")
                )

            # กระบอกเกจ Track (สี่เหลี่ยมผืนผ้าธรรมดา ไม่แหลม ไม่โค้ง)
            self.canvas.create_rectangle(
                bx1, self.bar_top_y, bx2, self.bar_bottom_y,
                fill=TRACK_COLOR, outline="",
                tags=("idle_sleeping_face", "waste_gauge")
            )

            # แถบ Fill ระดับขยะเริ่มต้น (สี่เหลี่ยมผืนผ้าธรรมดา ตัดขอบตรง)
            fill_color = GAUGE_COLORS.get(cat_key, "#4A5568")
            fill_item = self.canvas.create_rectangle(
                bx1, self.bar_bottom_y, bx2, self.bar_bottom_y,
                fill=fill_color, outline="",
                tags=("idle_sleeping_face", "waste_gauge", f"gauge_fill_{cat_key}")
            )

            # ข้อความแสดงเปอร์เซ็นต์
            pct_item = create_fn_text(
                bcx, self.bar_bottom_y + int(15 * self.scale),
                text="0%",
                fill="#374151",
                font=(self.font_family, self.s_thai_val, "bold"),
                tags=("idle_sleeping_face", "waste_gauge", f"gauge_pct_{cat_key}")
            )

            self.gauge_items[cat_key] = {
                "bx1": bx1, "bx2": bx2, "bcx": bcx,
                "fill_item": fill_item, "pct_item": pct_item,
                "fill_color": fill_color
            }

        # อัปเดตแสดงผลระดับขยะเริ่มต้นจากข้อมูลจริง
        self.update_waste_display()

    def update_waste_display(self, levels=None):
        """อัปเดตความสูงของแถบเกจและตัวเลขเปอร์เซ็นต์ตามข้อมูลจริงล่าสุด"""
        if levels:
            self.waste_levels.update(levels)
        elif self.get_waste_levels_fn and callable(self.get_waste_levels_fn):
            try:
                live_levels = self.get_waste_levels_fn()
                if live_levels:
                    self.waste_levels.update(live_levels)
            except Exception:
                pass

        # ดึงระดับความจุขยะทั้ง 3 ช่อง
        display_values = {
            "PLASTIC_BOTTLE": float(self.waste_levels.get("PLASTIC_BOTTLE", 0.0)),
            "ALUMINUM_CAN": float(self.waste_levels.get("ALUMINUM_CAN", 0.0)),
            "BEVERAGE_CARTON": float(self.waste_levels.get("BEVERAGE_CARTON", 0.0)),
        }

        for cat_key, info in self.gauge_items.items():
            pct = display_values.get(cat_key, 0.0)
            clamped_pct = max(0.0, min(100.0, pct))
            fill_h = int(self.bar_h * (clamped_pct / 100.0))
            fill_y1 = self.bar_bottom_y - fill_h

            bx1, bx2 = info["bx1"], info["bx2"]
            fill_item = info["fill_item"]
            pct_item = info["pct_item"]

            if fill_h <= 1:
                # ว่างเปล่า ซ่อนแท่ง
                self.canvas.itemconfigure(fill_item, state="hidden")
            else:
                self.canvas.itemconfigure(fill_item, state="normal")
                self.canvas.coords(fill_item, bx1, fill_y1, bx2, self.bar_bottom_y)

            # อัปเดตตัวเลขเปอร์เซ็นต์
            self.canvas.itemconfigure(pct_item, text=f"{int(round(clamped_pct))}%")

    def set_waste_levels(self, levels: dict):
        """ฟังก์ชันสำหรับภายนอก (Controller) เรียกอัปเดตระดับขยะทันที"""
        self.update_waste_display(levels)

    def _poll_waste_levels(self):
        """วนรอบอ่านค่าจากเซนเซอร์ทุก 2.5 วินาทีขณะหน้าหลับทำงาน"""
        if self.state != "sleeping":
            return
        self.update_waste_display()
        self.poll_timer = self.root.after(2500, self._poll_waste_levels)

    # ============================================================
    # MASCOT SLEEPING & WAKING ANIMATION
    # ============================================================
    def _draw_tilted_z(self, img, x, y, text, font, angle, color):
        dim = max(90, int(130 * self.scale))
        txt_img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        d = ImageDraw.Draw(txt_img)
        pad = int(20 * self.scale)
        d.text((pad, pad), text, font=font, fill=color)
        rotated = txt_img.rotate(angle, resample=Image.BICUBIC)
        img.paste(rotated, (int(x - dim // 2), int(y - dim // 2)), rotated)

    def _render_single_eye(self, open_ratio=0.0, radius=138, scale_x=1.0, scale_y=1.0):
        dim = int((radius * 2 + 90 * self.scale) * max(scale_x, scale_y))
        center = dim // 2
        rx = int(radius * scale_x)
        ry = int(radius * scale_y)
        rim_offset = int(20 * scale_y * self.scale)

        # 1. ฐานลูกตาสีเขียว + ขอบตาล่างสีดำ (เห็นชัดเจนเมื่อเปลือกตาเลื่อนเปิดขึ้น)
        base = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        d = ImageDraw.Draw(base)

        # ขอบตาล่างสีดำของเบ้าตา (เยื้องลงด้านล่าง เกิดเงาพระจันทร์เสี้ยว)
        d.ellipse(
            [center - rx, center - ry + rim_offset, center + rx, center + ry + rim_offset],
            fill=BLACK_RIM
        )
        # ลูกตาสีเขียว
        d.ellipse(
            [center - rx, center - ry, center + rx, center + ry],
            fill=GREEN_EYE
        )
        # ประกายตาสีขาวด้านใน
        sp = (radius / 75.0) * min(scale_x, scale_y)
        d.ellipse(
            [center + int(18 * sp), center - int(36 * sp), 
             center + int(38 * sp), center - int(16 * sp)], 
            fill=(255, 255, 255, 240)
        )
        d.ellipse(
            [center + int(35 * sp), center - int(6 * sp), 
             center + int(45 * sp), center + int(4 * sp)], 
            fill=(255, 255, 255, 190)
        )

        if open_ratio >= 1.0:
            return base

        # 2. แผ่นเปลือกตาสีเทา (#7E897E) ที่จะค่อยๆ สไลด์เปิดขึ้นด้านบน
        eyelid = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        de = ImageDraw.Draw(eyelid)
        de.ellipse(
            [center - rx, center - ry, center + rx, center + ry],
            fill=GRAY_EYE
        )

        # คำนวณความสูงของเปลือกตาที่เลื่อนขึ้น
        travel_dist = int(ry * 2.2)
        slide_offset = int(open_ratio * travel_dist)

        moved = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        moved.paste(eyelid, (0, -slide_offset))

        # หน้ากากจำกัดขอบเขตตา (Mask)
        mask = Image.new("L", (dim, dim), 0)
        dm = ImageDraw.Draw(mask)
        dm.ellipse(
            [center - rx, center - ry, center + rx, center + ry],
            fill=255
        )

        eyelid_layer = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        eyelid_layer.paste(moved, (0, 0), mask)

        # รวมเลเยอร์อย่างเนียนสนิท ไม่มีช่องว่างหรือเส้นขาว
        return Image.alpha_composite(base, eyelid_layer)

    def _draw_mouth(self, draw, cx, cy, open_ratio=0.0, startle_ratio=0.0, is_settled=False):
        """วาดปากตามสถานะ (หลับลึก โค้งคว่ำ ⏜ -> สะดุ้งตกใจ -> ยิ้มหวาน) พร้อมเส้นปากหนาคมชัด"""
        mouth_y = cy + int(138 * self.scale)
        stroke = max(6, int(13 * self.scale))

        if open_ratio < 0.1:
            # ปากคนหลับ (เส้นโค้งคว่ำ ⏜ ตาม Mockup)
            mouth_w = int(80 * self.scale)
            mouth_h = int(30 * self.scale)
            draw.arc(
                [cx - mouth_w, mouth_y - mouth_h, cx + mouth_w, mouth_y + mouth_h],
                start=205, end=335, fill=BLACK_RIM, width=stroke
            )
        elif startle_ratio > 0.15 and not is_settled:
            # ปากสะดุ้งตกใจ ('อ๊ะ!')
            ow = int((18 + 14 * startle_ratio) * self.scale)
            oh = int((18 + 22 * startle_ratio) * self.scale)
            draw.ellipse([cx - ow, mouth_y - oh, cx + ow, mouth_y + oh], fill=BLACK_RIM)
        else:
            # ปากยิ้มหวานสดใส
            smile_w = int(68 * self.scale)
            smile_h = int(36 * self.scale)
            draw.arc(
                [cx - smile_w, mouth_y - smile_h, cx + smile_w, mouth_y + smile_h],
                start=30, end=150, fill=BLACK_RIM, width=stroke
            )

    def _render_frame(self, t=0.0, open_ratio=0.0, dy=0.0, scale_x=1.0, scale_y=1.0, startle_ratio=0.0, is_settled=False):
        """เรนเดอร์เฟรม Animation ใบหน้า Mascot บนพื้นหลังขาว"""
        img = Image.new("RGBA", (self.width, self.height), BG_COLOR)
        draw = ImageDraw.Draw(img)

        cx = self.face_cx
        cy = int(self.face_cy + dy)
        eye_spacing = int(self.eye_spacing * scale_x)
        radius = int(self.eye_radius)

        # วาดดวงตาทั้ง 2 ข้าง
        eye_single = self._render_single_eye(open_ratio=open_ratio, radius=radius, scale_x=scale_x, scale_y=scale_y)
        ew, eh = eye_single.size

        for side in (-1, 1):
            ex = cx + side * eye_spacing
            img.paste(eye_single, (ex - ew // 2, cy - eh // 2), eye_single)

        # วาดปาก
        self._draw_mouth(draw, cx, cy, open_ratio=open_ratio, startle_ratio=startle_ratio, is_settled=is_settled)

        # ตัวอักษร Z z z สีเขียวเอียงลอยขึ้นเหนือตาซ้าย (เฉพาะตอนยังหลับ)
        if open_ratio < 0.1:
            z_offset = (t * 18) % 45
            # จุดอ้างอิงเหนือตาซ้าย
            zx = cx - eye_spacing - int(105 * self.scale)
            zy = cy - int(65 * self.scale) - z_offset

            # ตัว Z ขนาดเล็ก (ล่างสุด)
            self._draw_tilted_z(img, zx + int(30 * self.scale), zy + int(35 * self.scale), "Z", self.font_z_sm, -25, (*Z_COLOR, 215))
            # ตัว Z ขนาดกลาง
            self._draw_tilted_z(img, zx - int(15 * self.scale), zy - int(45 * self.scale), "Z", self.font_z_md, -35, (*Z_COLOR, 240))
            # ตัว Z ขนาดใหญ่ (บนสุด)
            self._draw_tilted_z(img, zx - int(60 * self.scale), zy - int(130 * self.scale), "Z", self.font_z_lg, -45, (*Z_COLOR, 255))

        return ImageTk.PhotoImage(img.convert("RGB"))

    def _pre_render_frames(self):
        """เรนเดอร์เฟรมล่วงหน้าทั้งหมดเพื่อ 0% CPU ระหว่าง Idle"""
        # 1. เฟรมช่วงหลับกรน (20 เฟรม)
        for i in range(20):
            t = (i / 20.0) * 3.0
            cycle = t % 3.0
            if cycle < 1.4:
                p = cycle / 1.4
                smooth = 0.5 - 0.5 * math.cos(p * math.pi)
                dy = -10 * smooth
                sy = 1.0 + 0.04 * smooth
            elif cycle < 1.7:
                dy = -10
                sy = 1.04
            elif cycle < 2.5:
                p = (cycle - 1.7) / 0.8
                smooth = 0.5 + 0.5 * math.cos(p * math.pi)
                dy = -10 * smooth
                sy = 1.0 + 0.04 * smooth
            else:
                dy = 0
                sy = 1.0

            photo = self._render_frame(t=t, open_ratio=0.0, dy=dy, scale_x=1.0, scale_y=sy)
            self.sleep_photo_frames.append(photo)

        # 2. เฟรมช่วงสะดุ้งตื่น (12 เฟรม)
        startle_steps = [
            (0.30, -16, 1.06, 1.08, 0.40, False, 60),
            (0.70, -28, 1.12, 1.14, 0.80, False, 65),
            (1.00, -34, 1.15, 1.16, 1.00, False, 75),
            (1.00, -32, 1.14, 1.15, 0.95, False, 70),
            (1.00, -18, 1.08, 1.08, 0.70, False, 65),
            (1.00,   0, 1.02, 1.00, 0.40, False, 60),
            (1.00, +12, 1.04, 0.94, 0.20, False, 70),
            (1.00,  +6, 1.02, 0.97, 0.10, False, 65),
            (1.00,  -8, 1.01, 1.03, 0.00, True,  70),
            (1.00,  -3, 1.00, 1.01, 0.00, True,  65),
            (1.00,  +2, 1.00, 0.99, 0.00, True,  60),
            (1.00,   0, 1.00, 1.00, 0.00, True,  70),
        ]

        for op, dy, sx, sy, sr, st, dur in startle_steps:
            photo = self._render_frame(t=0.0, open_ratio=op, dy=dy, scale_x=sx, scale_y=sy, startle_ratio=sr, is_settled=st)
            self.waking_choreography.append((photo, dur))

    def start(self):
        """เริ่มเล่น Animation นอนหลับ และเริ่ม Loop อัปเดตเซนเซอร์"""
        self.state = "sleeping"
        if hasattr(self, 'sub_item') and self.sub_item and self.canvas:
            try:
                self.canvas.itemconfig(self.sub_item, text="แตะเพื่อเริ่ม", fill=TEXT_INK, font=(self.font_family, self.s_thai_prompt, "bold"))
                self.canvas.tag_raise(self.sub_item)
            except Exception:
                pass
        self._play_sleep_loop()
        self._poll_waste_levels()

    def _play_sleep_loop(self):
        if self.state != "sleeping":
            return

        self.canvas.itemconfig(self.image_item, image=self.sleep_photo_frames[self.sleep_frame_idx])
        self.sleep_frame_idx = (self.sleep_frame_idx + 1) % len(self.sleep_photo_frames)
        self.timer_id = self.root.after(70, self._play_sleep_loop)

    def on_tap(self, event=None):
        """เมื่อมีคนแตะหน้าจอ -> สะดุ้งตื่น"""
        if self.state == "sleeping":
            self.wake_up()

    def wake_up(self, on_complete=None):
        """เล่น Animation สะดุ้งตื่น"""
        if self.state == "waking" or self.state == "awake":
            return

        self.state = "waking"
        if on_complete:
            self.on_wake_complete = on_complete

        if self.timer_id:
            self.root.after_cancel(self.timer_id)
            self.timer_id = None

        if self.poll_timer:
            self.root.after_cancel(self.poll_timer)
            self.poll_timer = None

        self._play_startle_sequence(0)

    def _play_startle_sequence(self, step_idx):
        if self.state != "waking":
            return

        if step_idx < len(self.waking_choreography):
            photo, duration = self.waking_choreography[step_idx]
            self.canvas.itemconfig(self.image_item, image=photo)
            if step_idx == 0 and hasattr(self, 'sub_item') and self.sub_item and self.canvas:
                try:
                    self.canvas.itemconfig(self.sub_item, text="")
                except Exception:
                    pass
            self.timer_id = self.root.after(duration, lambda: self._play_startle_sequence(step_idx + 1))
        else:
            self.state = "awake"
            if hasattr(self, 'sub_item') and self.sub_item and self.canvas:
                try:
                    self.canvas.itemconfig(self.sub_item, text="ยินดีต้อนรับครับ!", fill="#16A34A", font=(self.font_family, self.s_thai_prompt, "bold"))
                    self.canvas.tag_raise(self.sub_item)
                except Exception:
                    pass
            # ตื่นนิ่งยิ้มหวานค้างไว้ 380ms ก่อนเรียก Callback เปลี่ยนหน้า
            self.timer_id = self.root.after(380, self._on_wake_finished)

    def _on_wake_finished(self):
        if self.on_wake_complete and callable(self.on_wake_complete):
            self.on_wake_complete()

    def stop(self):
        """หยุดการทำงานและเคลียร์ Timer และองค์ประกอบทั้งหมด"""
        self.state = "stopped"
        if self.timer_id:
            try:
                self.root.after_cancel(self.timer_id)
            except Exception:
                pass
            self.timer_id = None

        if self.poll_timer:
            try:
                self.root.after_cancel(self.poll_timer)
            except Exception:
                pass
            self.poll_timer = None

        try:
            self.canvas.unbind("<Button-1>")
        except Exception:
            pass

        try:
            self.canvas.delete("idle_sleeping_face")
            self.canvas.delete("waste_gauge")
        except Exception:
            pass

        for item_name in ('image_item', 'sub_item'):
            setattr(self, item_name, None)

        if getattr(self, 'created_canvas', False) and hasattr(self, 'canvas') and self.canvas:
            try:
                self.canvas.destroy()
            except Exception:
                pass
            self.canvas = None
