"""
Bottle Size Classification from YOLO Bounding Boxes
"""

import math

# ==========================================
# CONFIGURATION - ตัวแปรที่ต้องตั้งค่าและปรับจูน (Adjustable Variables)
# ==========================================
class Config:
    # 1. SCALE: การแปลง Pixel เป็นเซนติเมตร (สำคัญมาก ต้องตั้งกล้องและระยะให้คงที่)
    # วิธีหา: วางขวดที่รู้ขนาดจริง (เช่น กว้าง 6.5 cm) แล้วดูว่า YOLO ให้ bbox กว้างกี่ pixel
    # สูตร: ขนาดจริง (cm) / ขนาดที่อ่านได้จาก YOLO (px)
    # ตัวอย่าง: 6.5 cm / 130 px = 0.05
    CM_PER_PIXEL = 0.05
    
    # 2. K FACTOR: ตัวคูณชดเชยปริมาตร (กรณีใช้วิธีคำนวณปริมาตรทรงกระบอก)
    # เนื่องจากขวดไม่ใช่ทรงกระบอกสมบูรณ์ (มีส่วนคอขวดที่เว้า) 
    # ค่ามักจะอยู่ระหว่าง 0.75 - 0.9 (ต้องทดลองเทียบปริมาตรที่คำนวณได้กับปริมาตรจริง)
    CORRECTION_FACTOR_K = 0.85

    # 3. THRESHOLDS (VOLUME): เกณฑ์การแบ่งขนาดจากปริมาตรที่คำนวณได้ (ml)
    # รูปแบบ: ((min_ml, max_ml), "label")
    VOLUME_THRESHOLDS = [
        ((300, 450), "350 ml"),
        ((450, 550), "500 ml"),
        ((550, 700), "600 ml"),
        ((700, 1500), "1 L")
    ]

    # 4. THRESHOLDS (HEIGHT): เกณฑ์การแบ่งขนาดจากความสูง (วิธีแนะนำ: แม่นยำและเร็วกว่า)
    # รูปแบบ: ((min_height_cm, max_height_cm), "label")
    # ตัวเลขเหล่านี้คือค่าสมมติ ต้องปรับจูนตามขวดจริงที่คุณใช้
    HEIGHT_THRESHOLDS = [
        ((12.0, 16.5), "350 ml"),
        ((16.5, 19.5), "500 ml"),
        ((19.5, 22.5), "600 ml"),
        ((22.5, 30.0), "1 L")
    ]

# ==========================================
# LOGIC & CALCULATIONS
# ==========================================

def calculate_dimensions_and_volume(w_px: float, h_px: float) -> tuple[float, float, float]:
    """
    คำนวณขนาด (cm) และปริมาตร (ml) จาก Bounding Box โดยตั้งสมมติฐานว่าเป็นทรงกระบอก
    """
    # Step 2: แปลง pixel -> cm
    w_cm = w_px * Config.CM_PER_PIXEL
    h_cm = h_px * Config.CM_PER_PIXEL
    
    # Step 3: คำนวณปริมาตร (ml หรือ cm^3) (V = π * r^2 * h)
    r = w_cm / 2
    volume_raw = math.pi * (r ** 2) * h_cm
    
    # Step 4: ปรับค่าความเพี้ยนด้วย k factor
    volume_corrected = volume_raw * Config.CORRECTION_FACTOR_K
    
    return volume_corrected, w_cm, h_cm

def classify_by_volume(volume_ml: float) -> str:
    """
    จัดประเภทขวดตามช่วงปริมาตรที่คำนวณได้
    """
    for (min_val, max_val), label in Config.VOLUME_THRESHOLDS:
        if min_val <= volume_ml < max_val:
            return label
    return "Unknown (Out of range)"

def classify_by_height(h_cm: float) -> str:
    """
    จัดประเภทขวดตามความสูงขวด (วิธีที่แนะนำ)
    """
    for (min_val, max_val), label in Config.HEIGHT_THRESHOLDS:
        if min_val <= h_cm < max_val:
            return label
    return "Unknown (Out of range)"

def process_bottle_detection(w_px: float, h_px: float, use_height_method: bool = True) -> dict:
    """
    ฟังก์ชันหลักสำหรับประมวลผล Bounding Box จาก YOLO แบบ End-to-End
    """
    # คำนวณขนาดและปริมาตร
    volume_ml, w_cm, h_cm = calculate_dimensions_and_volume(w_px, h_px)
    ratio = h_cm / w_cm if w_cm > 0 else 0
    
    # เลือกวิธีจัดประเภท
    if use_height_method:
        label = classify_by_height(h_cm)
        method_used = "Height Classification (Recommended)"
    else:
        label = classify_by_volume(volume_ml)
        method_used = "Volume Classification"
        
    return {
        "input_px": {"width": w_px, "height": h_px},
        "real_cm": {"width": round(w_cm, 2), "height": round(h_cm, 2)},
        "ratio_hw": round(ratio, 2),
        "estimated_volume_ml": round(volume_ml, 2),
        "method_used": method_used,
        "predicted_size": label
    }

# ==========================================
# EXAMPLE USAGE (ส่วนทดสอบการทำงาน)
# ==========================================
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

if __name__ == "__main__":
    # สมมติค่า w_px, h_px ที่ได้จาก YOLO Bounding Box
    mock_yolo_detections = [
        {"w_px": 125, "h_px": 370},  # สมมติว่าเป็นขวด 500ml (สูงประมาณ 18.5 cm)
        {"w_px": 135, "h_px": 410},  # สมมติว่าเป็นขวด 600ml (สูงประมาณ 20.5 cm)
    ]
    
    print("=== ระบบคำนวณและแยกแยะขนาดขวด ===")
    for i, det in enumerate(mock_yolo_detections):
        w = det["w_px"]
        h = det["h_px"]
        
        print(f"\n[{i+1}] ตรวจพบขวด Bbox ขนาด: {w}x{h} px")
        
        # 1. ทดสอบวิธีจัดประเภทด้วยความสูง (วิธีแนะนำ)
        res_height = process_bottle_detection(w, h, use_height_method=True)
        print(f"  📌 วิธีความสูง (แนะนำ) : กว้าง {res_height['real_cm']['width']} cm, สูง {res_height['real_cm']['height']} cm")
        print(f"  ✅ ขนาดขวดที่คาดเดา  : -> [ {res_height['predicted_size']} ]")
        
        # 2. ทดสอบวิธีจัดประเภทด้วยปริมาตร (ทางเลือก)
        res_vol = process_bottle_detection(w, h, use_height_method=False)
        print(f"  📌 วิธีปริมาตร       : ปริมาตรประเมิน {res_vol['estimated_volume_ml']} ml")
        print(f"  ✅ ขนาดขวดที่คาดเดา  : -> [ {res_vol['predicted_size']} ]")
