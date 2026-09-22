# ============================
# SBAY Smart Bin - Idle Sleeping Face Animation
# จัดการ Animation หน้าตากำลังหลับ และสะดุ้งตื่นเมื่อแตะหน้าจอ
# ============================

import math
import tkinter as tk
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageTk

# สีมาตรฐานตามการออกแบบ
BG_COLOR = (255, 255, 255)     # พื้นหลังขาว
GRAY_EYE = (126, 137, 126)     # เปลือกตาสีเทา (#7e897e)
GREEN_EYE = (105, 158, 85)     # ตาสีเขียวข้างใน (#699e55)
Z_COLOR = (82, 128, 66)        # สีตัว Z เขียว (#528042)
BLACK_RIM = (0, 0, 0)          # ขอบตาล่างสีดำ และปาก (#000000)
TEXT_GREEN = (105, 158, 85)
TEXT_SUB = (148, 163, 184)


class IdleSleepingFace:
    """
    คลาสควบคุม Animation หน้าตานอนหลับ/ตื่นนอนสำหรับ Tkinter GUI:
    - สถานะหลับ (Sleeping): เปลือกตาสีเทาพร้อมขอบตาล่างสีดำ หายใจกรนขึ้น-ลงเบาๆ และตัว Zzz ลอย
    - สถานะตื่น (Waking): สะดุ้งเด้งลอยขึ้น (Startle Bounce) เปลือกตาสไลด์เปิดขึ้นอย่างรวดเร็ว
      เผยให้เห็นลูกตาสีเขียวสดใสข้างใน และปากเปลี่ยนเป็นรอยยิ้มหวาน
    """

    def __init__(self, root, container, width=960, height=540, on_wake_complete=None, canvas=None):
        self.root = root
        self.container = container
        self.width = width
        self.height = height
        self.on_wake_complete = on_wake_complete

        self.state = "sleeping"  # 'sleeping', 'waking', 'awake', 'stopped'
        self.sleep_frame_idx = 0
        self.timer_id = None

        self.scale = max(0.5, min(self.width / 960.0, self.height / 540.0))
        s_title = max(18, int(32 * self.scale))
        s_thai = max(14, int(20 * self.scale))
        s_thai_bold = max(15, int(22 * self.scale))
        s_z_sm = max(20, int(36 * self.scale))
        s_z_md = max(28, int(52 * self.scale))
        s_z_lg = max(38, int(72 * self.scale))

        # โหลดฟอนต์ระบบ
        try:
            self.font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", s_title)
            self.font_thai = ImageFont.truetype("C:/Windows/Fonts/leelawad.ttf", s_thai)
            self.font_thai_bold = ImageFont.truetype("C:/Windows/Fonts/leelawad.ttf", s_thai_bold)
            self.font_z_sm = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", s_z_sm)
            self.font_z_md = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", s_z_md)
            self.font_z_lg = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", s_z_lg)
        except Exception:
            # Fallback สำหรับเครื่อง Linux / Raspberry Pi
            try:
                self.font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s_title)
                self.font_thai = ImageFont.truetype("/usr/share/fonts/truetype/freefont/FreeSans.ttf", s_thai)
                self.font_thai_bold = ImageFont.truetype("/usr/share/fonts/truetype/freefont/FreeSansBold.ttf", s_thai_bold)
                self.font_z_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s_z_sm)
                self.font_z_md = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s_z_md)
                self.font_z_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s_z_lg)
            except Exception:
                self.font_title = ImageFont.load_default()
                self.font_thai = ImageFont.load_default()
                self.font_thai_bold = ImageFont.load_default()
                self.font_z_sm = ImageFont.load_default()
                self.font_z_md = ImageFont.load_default()
                self.font_z_lg = ImageFont.load_default()

        # สร้างเฟรมภาพล่วงหน้า (Pre-render) เพื่อประสิทธิภาพสูงสุด 0% CPU
        self.sleep_photo_frames = []
        self.waking_choreography = []  # เก็บ (photo_image, duration_ms)
        self._pre_render_frames()

        # ใช้ Canvas ที่ส่งเข้ามา หรือสร้าง Canvas ใหม่ถ้าไม่มี
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

        # ภาพเริ่มต้น
        self.image_item = self.canvas.create_image(
            self.width // 2, self.height // 2,
            image=self.sleep_photo_frames[0],
            tags="idle_sleeping_face"
        )

        # ผูก Event แตะหน้าจอเพื่อสะดุ้งตื่น
        self.canvas.tag_bind("idle_sleeping_face", "<Button-1>", self.on_tap)
        self.canvas.bind("<Button-1>", self.on_tap)


    def _draw_tilted_z(self, img, x, y, text, font, angle, color):
        dim = max(100, int(150 * self.scale))
        txt_img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        d = ImageDraw.Draw(txt_img)
        pad = int(25 * self.scale)
        d.text((pad, pad), text, font=font, fill=color)
        rotated = txt_img.rotate(angle, resample=Image.BICUBIC)
        img.paste(rotated, (int(x - dim // 2), int(y - dim // 2)), rotated)

    def _render_single_eye(self, open_ratio=0.0, radius=75, scale_x=1.0, scale_y=1.0):
        dim = int((radius * 2 + 90 * self.scale) * max(scale_x, scale_y))
        center = dim // 2
        rx = int(radius * scale_x)
        ry = int(radius * scale_y)
        rim_offset = int(12 * scale_y * self.scale)

        # 1. ฐานลูกตาสีเขียว (เห็นชัดเจนเมื่อเปลือกตาเลื่อนเปิดขึ้น)
        eye_img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        eye_draw = ImageDraw.Draw(eye_img)

        # ขอบตาล่างสีดำของเบ้าตา
        eye_draw.ellipse(
            [center - rx, center - ry + rim_offset, center + rx, center + ry + rim_offset],
            fill=BLACK_RIM
        )
        # ลูกตาสีเขียว
        eye_draw.ellipse(
            [center - rx, center - ry, center + rx, center + ry],
            fill=GREEN_EYE
        )
        # ประกายตาสีขาวด้านใน
        sparkle_scale = min(scale_x, scale_y) * self.scale
        eye_draw.ellipse(
            [center + int(18*sparkle_scale), center - int(36*sparkle_scale), 
             center + int(38*sparkle_scale), center - int(16*sparkle_scale)], 
            fill=(255, 255, 255, 240)
        )
        eye_draw.ellipse(
            [center + int(35*sparkle_scale), center - int(6*sparkle_scale), 
             center + int(45*sparkle_scale), center + int(4*sparkle_scale)], 
            fill=(255, 255, 255, 190)
        )

        if open_ratio >= 1.0:
            return eye_img

        # 2. แผ่นเปลือกตาสีเทา (#7e897e) ที่จะค่อยๆ สไลด์เปิดขึ้นด้านบน
        eyelid_layer = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        eyelid_draw = ImageDraw.Draw(eyelid_layer)
        eyelid_draw.ellipse(
            [center - rx, center - ry, center + rx, center + ry],
            fill=GRAY_EYE
        )

        # คำนวณความสูงของเปลือกตาที่เลื่อนขึ้น
        travel_dist = int(ry * 2.3)
        slide_offset = int(open_ratio * travel_dist)

        moved_eyelid = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        moved_eyelid.paste(eyelid_layer, (0, -slide_offset))

        # หน้ากากจำกัดขอบเขตตา (Mask)
        mask_img = Image.new("L", (dim, dim), 0)
        mask_draw = ImageDraw.Draw(mask_img)
        mask_draw.ellipse(
            [center - rx, center - ry, center + rx, center + ry + rim_offset],
            fill=255
        )

        final_eye = Image.composite(moved_eyelid, eye_img, mask_img)

        # วาดเส้นขอบตาสีดำด้านล่างทับหน้าสุดท้าย
        final_draw = ImageDraw.Draw(final_eye)
        final_draw.arc(
            [center - rx, center - ry + rim_offset, center + rx, center + ry + rim_offset],
            start=0, end=180, fill=BLACK_RIM, width=max(4, int(7 * self.scale))
        )
        return final_eye

    def _draw_mouth(self, draw, cx, cy, open_ratio=0.0, startle_ratio=0.0, is_settled=False):
        """วาดปากตามสถานะ (หลับลึก -> ตกใจสะดุ้ง -> ยิ้มหวาน)"""
        mouth_y = cy + int(115 * self.scale)
        stroke = max(4, int(7 * self.scale))

        if open_ratio < 0.1:
            # ปากคนหลับ (เส้นโค้งคว่ำ)
            mouth_w = int(42 * self.scale)
            mouth_h = int(24 * self.scale)
            draw.arc(
                [cx - mouth_w, mouth_y - mouth_h, cx + mouth_w, mouth_y + mouth_h],
                start=210, end=330, fill=BLACK_RIM, width=stroke
            )
        elif startle_ratio > 0.15 and not is_settled:
            # ปากสะดุ้งตกใจ ('อ๊ะ!')
            ow = int((14 + 10 * startle_ratio) * self.scale)
            oh = int((14 + 16 * startle_ratio) * self.scale)
            draw.ellipse([cx - ow, mouth_y - oh, cx + ow, mouth_y + oh], fill=BLACK_RIM)
        else:
            # ปากยิ้มหวานสดใส
            smile_w = int(46 * self.scale)
            smile_h = int(26 * self.scale)
            draw.arc(
                [cx - smile_w, mouth_y - smile_h, cx + smile_w, mouth_y + smile_h],
                start=30, end=150, fill=BLACK_RIM, width=stroke
            )

    def _render_frame(self, t=0.0, open_ratio=0.0, dy=0.0, scale_x=1.0, scale_y=1.0, startle_ratio=0.0, is_settled=False):
        img = Image.new("RGBA", (self.width, self.height), BG_COLOR)
        draw = ImageDraw.Draw(img)

        cx = self.width // 2
        cy = int(self.height * 0.40 + dy)
        eye_spacing = int(170 * scale_x * self.scale)
        radius = int(75 * self.scale)

        # วาดดวงตาทั้ง 2 ข้าง
        eye_single = self._render_single_eye(open_ratio=open_ratio, radius=radius, scale_x=scale_x, scale_y=scale_y)
        ew, eh = eye_single.size

        for side in (-1, 1):
            ex = cx + side * eye_spacing
            img.paste(eye_single, (ex - ew // 2, cy - eh // 2), eye_single)

        # วาดปาก
        self._draw_mouth(draw, cx, cy, open_ratio=open_ratio, startle_ratio=startle_ratio, is_settled=is_settled)

        # ตัวอักษร Z z z (เฉพาะตอนยังหลับ)
        if open_ratio < 0.1:
            z_offset = (t * 18) % 45
            self._draw_tilted_z(img, cx - int(350 * self.scale), cy + int(155 * self.scale) - z_offset, "Z", self.font_z_sm, -25, (*Z_COLOR, 200))
            self._draw_tilted_z(img, cx - int(390 * self.scale), cy + int(90 * self.scale) - z_offset, "Z", self.font_z_md, -35, (*Z_COLOR, 230))
            self._draw_tilted_z(img, cx - int(420 * self.scale), cy + int(15 * self.scale) - z_offset, "Z", self.font_z_lg, -45, (*Z_COLOR, 255))

        # ข้อความแบรนด์และคำแนะนำ
        title_text = "SBAY Smart Bin"
        try:
            bbox = draw.textbbox((0, 0), title_text, font=self.font_title)
            tw = bbox[2] - bbox[0]
        except Exception:
            tw = 250
        draw.text((cx - tw // 2, int(self.height * 0.74)), title_text, font=self.font_title, fill=TEXT_GREEN)

        if open_ratio < 0.2:
            sub_text = "แตะหน้าจอเพื่อเริ่มต้น"
            try:
                bbox_sub = draw.textbbox((0, 0), sub_text, font=self.font_thai)
                sw = bbox_sub[2] - bbox_sub[0]
            except Exception:
                sw = 200
            draw.text((cx - sw // 2, int(self.height * 0.83)), sub_text, font=self.font_thai, fill=TEXT_SUB)
        elif not is_settled:
            sub_text = ""
            try:
                bbox_sub = draw.textbbox((0, 0), sub_text, font=self.font_thai_bold)
                sw = bbox_sub[2] - bbox_sub[0]
            except Exception:
                sw = 160
            draw.text((cx - sw // 2, int(self.height * 0.83)), sub_text, font=self.font_thai_bold, fill=(234, 88, 12))
        else:
            sub_text = "ยินดีต้อนรับครับ!"
            try:
                bbox_sub = draw.textbbox((0, 0), sub_text, font=self.font_thai_bold)
                sw = bbox_sub[2] - bbox_sub[0]
            except Exception:
                sw = 180
            draw.text((cx - sw // 2, int(self.height * 0.83)), sub_text, font=self.font_thai_bold, fill=(22, 163, 74))

        return ImageTk.PhotoImage(img.convert("RGB"))

    def _pre_render_frames(self):
        # 1. เฟรมช่วงหลับกรน (20 เฟรม)
        for i in range(20):
            t = (i / 20.0) * 3.0
            cycle = t % 3.0
            if cycle < 1.4:
                p = cycle / 1.4
                smooth = 0.5 - 0.5 * math.cos(p * math.pi)
                dy = -12 * smooth
                sy = 1.0 + 0.05 * smooth
            elif cycle < 1.7:
                dy = -12
                sy = 1.05
            elif cycle < 2.5:
                p = (cycle - 1.7) / 0.8
                smooth = 0.5 + 0.5 * math.cos(p * math.pi)
                dy = -12 * smooth
                sy = 1.0 + 0.05 * smooth
            else:
                dy = 0
                sy = 1.0

            photo = self._render_frame(t=t, open_ratio=0.0, dy=dy, scale_x=1.0, scale_y=sy)
            self.sleep_photo_frames.append(photo)

        # 2. เฟรมช่วงสะดุ้งตื่น (12 เฟรม)
        startle_steps = [
            # (open_ratio, dy, scale_x, scale_y, startle_ratio, is_settled, duration_ms)
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
        """เริ่มเล่น Animation นอนหลับ"""
        self.state = "sleeping"
        self._play_sleep_loop()

    def _play_sleep_loop(self):
        if self.state != "sleeping":
            return

        # อัปเดตเฟรมภาพปัจจุบัน
        self.canvas.itemconfig(self.image_item, image=self.sleep_photo_frames[self.sleep_frame_idx])
        self.sleep_frame_idx = (self.sleep_frame_idx + 1) % len(self.sleep_photo_frames)

        # หน่วงเวลา 70ms ต่อเฟรม
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

        # ยกเลิก Timer นอนหลับ
        if self.timer_id:
            self.root.after_cancel(self.timer_id)
            self.timer_id = None

        self._play_startle_sequence(0)

    def _play_startle_sequence(self, step_idx):
        if self.state != "waking":
            return

        if step_idx < len(self.waking_choreography):
            photo, duration = self.waking_choreography[step_idx]
            self.canvas.itemconfig(self.image_item, image=photo)
            self.timer_id = self.root.after(duration, lambda: self._play_startle_sequence(step_idx + 1))
        else:
            self.state = "awake"
            # ตื่นนิ่งยิ้มหวานค้างไว้ 400ms ก่อนเรียก Callback เปลี่ยนหน้า
            self.timer_id = self.root.after(400, self._on_wake_finished)

    def _on_wake_finished(self):
        if self.on_wake_complete and callable(self.on_wake_complete):
            self.on_wake_complete()

    def stop(self):
        """หยุดการทำงานและเคลียร์ Timer ทั้งหมด"""
        self.state = "stopped"
        if self.timer_id:
            try:
                self.root.after_cancel(self.timer_id)
            except Exception:
                pass
            self.timer_id = None
        try:
            self.canvas.unbind("<Button-1>")
        except Exception:
            pass
        if hasattr(self, 'image_item') and self.image_item and self.canvas:
            try:
                self.canvas.delete(self.image_item)
            except Exception:
                pass
        if getattr(self, 'created_canvas', False) and hasattr(self, 'canvas') and self.canvas:
            try:
                self.canvas.destroy()
            except Exception:
                pass
            self.canvas = None

