import os
import sys
import math
from PIL import Image, ImageDraw, ImageFont

BG_COLOR = (255, 255, 255)
GRAY_EYE = (126, 137, 126)     # #7E897E
GREEN_EYE = (105, 158, 85)     # #699E55
Z_COLOR = (82, 128, 66)        # #528042
BLACK_RIM = (0, 0, 0)
TEXT_INK = '#173129'
TEXT_MUTED = '#6B7C73'
GAUGE_COLORS = {
    'PLASTIC_BOTTLE': '#4A5568',
    'ALUMINUM_CAN': '#4E7D42',
    'BEVERAGE_CARTON': '#68B4D8',
}
TRACK_COLOR = '#E5E7EB'

assets_dir = r"d:\SBAY-iot\iot-device\bin-device\assets"
out_dir = r"C:\Users\Admin\.gemini\antigravity-ide\brain\3b49f84a-0443-458a-8a57-a2357aad61d0"

# Fonts
try:
    font_thai_title = ImageFont.truetype("C:/Windows/Fonts/leelawdb.ttf", 24)
    font_thai_sub = ImageFont.truetype("C:/Windows/Fonts/leelawad.ttf", 13)
    font_thai_prompt = ImageFont.truetype("C:/Windows/Fonts/leelawdb.ttf", 26)
    font_thai_pct = ImageFont.truetype("C:/Windows/Fonts/leelawdb.ttf", 13)
    font_z_sm = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 38)
    font_z_md = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 56)
    font_z_lg = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 76)
except Exception:
    font_thai_title = ImageFont.load_default()
    font_thai_sub = ImageFont.load_default()
    font_thai_prompt = ImageFont.load_default()
    font_thai_pct = ImageFont.load_default()
    font_z_sm = ImageFont.load_default()
    font_z_md = ImageFont.load_default()
    font_z_lg = ImageFont.load_default()

def draw_tilted_z(img, x, y, text, font, angle, color):
    dim = 160
    txt_img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    d = ImageDraw.Draw(txt_img)
    d.text((25, 25), text, font=font, fill=color)
    rotated = txt_img.rotate(angle, resample=Image.BICUBIC)
    img.paste(rotated, (int(x - dim // 2), int(y - dim // 2)), rotated)

def render_zoomed_eye(open_ratio=0.0, radius=130):
    dim = int(radius * 2 + 80)
    center = dim // 2
    rx = radius
    ry = radius
    rim_offset = 18

    eye_img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    eye_draw = ImageDraw.Draw(eye_img)

    # Black outer rim / bottom crescent
    eye_draw.ellipse([center - rx, center - ry + rim_offset, center + rx, center + ry + rim_offset], fill=BLACK_RIM)
    # Green iris
    eye_draw.ellipse([center - rx, center - ry, center + rx, center + ry], fill=GREEN_EYE)
    # Sparkles
    sp_scale = radius / 75.0
    eye_draw.ellipse([center + int(18*sp_scale), center - int(36*sp_scale), center + int(38*sp_scale), center - int(16*sp_scale)], fill=(255, 255, 255, 240))
    eye_draw.ellipse([center + int(35*sp_scale), center - int(6*sp_scale), center + int(45*sp_scale), center + int(4*sp_scale)], fill=(255, 255, 255, 190))

    if open_ratio >= 1.0:
        return eye_img

    # Grey eyelid
    eyelid_layer = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    eyelid_draw = ImageDraw.Draw(eyelid_layer)
    eyelid_draw.ellipse([center - rx, center - ry, center + rx, center + ry], fill=GRAY_EYE)

    travel_dist = int(ry * 2.3)
    slide_offset = int(open_ratio * travel_dist)

    moved_eyelid = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    moved_eyelid.paste(eyelid_layer, (0, -slide_offset))

    mask_img = Image.new("L", (dim, dim), 0)
    mask_draw = ImageDraw.Draw(mask_img)
    mask_draw.ellipse([center - rx, center - ry, center + rx, center + ry + rim_offset], fill=255)

    final_eye = Image.composite(moved_eyelid, eye_img, mask_img)

    final_draw = ImageDraw.Draw(final_eye)
    final_draw.arc([center - rx, center - ry + rim_offset, center + rx, center + ry + rim_offset], start=0, end=180, fill=BLACK_RIM, width=10)
    return final_eye

def render_zoomed_idle_screen(open_ratio=0.0, W=1024, H=600):
    img = Image.new("RGBA", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 1. Left: 3 waste gauges
    gauge_left_x = 32
    bar_w = 26
    bar_gap = 18
    bar_top_y = 135
    bar_bottom_y = H - 85
    bar_h = bar_bottom_y - bar_top_y
    r = bar_w // 2

    # Title
    draw.text((gauge_left_x + 4, 30), "ปริมาณขยะ", font=font_thai_title, fill=TEXT_INK)

    # Icons
    icon_map = {
        "PLASTIC_BOTTLE": ("gauge_bottle.png", "ขวด", 65.0),
        "ALUMINUM_CAN": ("gauge_can.png", "ป๋อง", 48.0),
        "BEVERAGE_CARTON": ("gauge_carton.png", "กล่อง", 30.0),
    }

    for idx, (cat_key, (icon_name, cat_name, pct)) in enumerate(icon_map.items()):
        bx1 = gauge_left_x + idx * (bar_w + bar_gap)
        bx2 = bx1 + bar_w
        bcx = (bx1 + bx2) // 2

        # Icon
        ipath = os.path.join(assets_dir, icon_name)
        if os.path.exists(ipath):
            ico = Image.open(ipath).convert("RGBA")
            ico = ico.resize((32, 52), Image.Resampling.LANCZOS)
            img.paste(ico, (bcx - 16, 75), ico)

        # Track (capsule)
        draw.rounded_rectangle([bx1, bar_top_y, bx2, bar_bottom_y], radius=r, fill=TRACK_COLOR)

        # Fill
        fill_color = GAUGE_COLORS[cat_key]
        fill_h = int(bar_h * (pct / 100.0))
        fill_y1 = bar_bottom_y - fill_h
        draw.rounded_rectangle([bx1, fill_y1, bx2, bar_bottom_y], radius=r, fill=fill_color)

        # Percentage
        pct_text = f"{int(pct)}%"
        draw.text((bcx, bar_bottom_y + 16), pct_text, font=font_thai_pct, fill="#374151", anchor="mt")

        # Subtitle
        draw.text((bcx, bar_bottom_y + 36), cat_name, font=font_thai_sub, fill=TEXT_MUTED, anchor="mt")

    # 2. Right: Zoomed-in Close-up Face
    gauge_right_x = gauge_left_x + 3 * bar_w + 2 * bar_gap + 25
    face_cx = int((gauge_right_x + W) / 2.0) + 10 # ~616
    face_cy = int(H * 0.41) # ~246
    eye_spacing = 236
    eye_radius = 132

    eye_img = render_zoomed_eye(open_ratio=open_ratio, radius=eye_radius)
    ew, eh = eye_img.size

    for side in (-1, 1):
        ex = face_cx + side * eye_spacing
        img.paste(eye_img, (ex - ew // 2, face_cy - eh // 2), eye_img)

    # Mouth: thick line
    mouth_y = face_cy + 130
    mouth_stroke = 11

    if open_ratio < 0.1:
        # Arched sleeping mouth ⏜
        mouth_w = 75
        mouth_h = 28
        draw.arc([face_cx - mouth_w, mouth_y - mouth_h, face_cx + mouth_w, mouth_y + mouth_h], start=205, end=335, fill=BLACK_RIM, width=mouth_stroke)
        # Tilted Zs above left eye
        zx = face_cx - eye_spacing - 100
        zy = face_cy - 60
        draw_tilted_z(img, zx + 25, zy + 30, "Z", font_z_sm, -25, (*Z_COLOR, 215))
        draw_tilted_z(img, zx - 15, zy - 45, "Z", font_z_md, -35, (*Z_COLOR, 240))
        draw_tilted_z(img, zx - 55, zy - 125, "Z", font_z_lg, -45, (*Z_COLOR, 255))
    else:
        # Cute smile ‿
        mouth_w = 60
        mouth_h = 32
        draw.arc([face_cx - mouth_w, mouth_y - mouth_h, face_cx + mouth_w, mouth_y + mouth_h], start=30, end=150, fill=BLACK_RIM, width=mouth_stroke)

    # Prompt: แตะเพื่อเริ่ม
    draw.text((face_cx, mouth_y + 60), "แตะเพื่อเริ่ม", font=font_thai_prompt, fill=TEXT_INK, anchor="mt")

    return img

if __name__ == "__main__":
    img_idle = render_zoomed_idle_screen(open_ratio=0.0)
    img_idle.save(os.path.join(out_dir, "zoomed_close_up_idle_preview.png"))

    img_awake = render_zoomed_idle_screen(open_ratio=1.0)
    img_awake.save(os.path.join(out_dir, "zoomed_close_up_awake_preview.png"))
    print("Zoomed screens saved successfully!")
