import math
import settings.config as config

def has_2point_calibration():
    """ตรวจสอบว่ามีการตั้งค่า 2-Point Calibration (เล็กสุด กับ ใหญ่สุด) ครบถ้วนหรือไม่"""
    has_small = (
        hasattr(config, 'REF_SMALL_W_CM') and hasattr(config, 'REF_SMALL_W_PX') and
        hasattr(config, 'REF_SMALL_H_CM') and hasattr(config, 'REF_SMALL_H_PX')
    )
    has_large = (
        hasattr(config, 'REF_LARGE_W_CM') and hasattr(config, 'REF_LARGE_W_PX') and
        hasattr(config, 'REF_LARGE_H_CM') and hasattr(config, 'REF_LARGE_H_PX')
    )
    return has_small and has_large

def get_scale():
    """
    ดึงค่าสเกลการแปลง Pixel -> CM
    - กรณี 2-Point Calibration: ส่งคืน (slope, intercept) ของแกน W และแกน H
    - กรณี 1-Point Scaling เดิม: ส่งคืนอัตราส่วน scale_w, scale_h
    """
    if getattr(config, 'USE_FOCAL', False):
        return None, None

    # 1. ใช้งานระบบ 2-Point Calibration (Linear Interpolation)
    if has_2point_calibration():
        # คำนวณ Slope และ Intercept ของแกน W (ความกว้าง)
        px1_w, cm1_w = float(config.REF_SMALL_W_PX), float(config.REF_SMALL_W_CM)
        px2_w, cm2_w = float(config.REF_LARGE_W_PX), float(config.REF_LARGE_W_CM)
        if px2_w != px1_w:
            slope_w = (cm2_w - cm1_w) / (px2_w - px1_w)
            intercept_w = cm1_w - (slope_w * px1_w)
        else:
            slope_w = cm1_w / px1_w if px1_w > 0 else 0.0
            intercept_w = 0.0

        # คำนวณ Slope และ Intercept ของแกน H (ความสูง)
        px1_h, cm1_h = float(config.REF_SMALL_H_PX), float(config.REF_SMALL_H_CM)
        px2_h, cm2_h = float(config.REF_LARGE_H_PX), float(config.REF_LARGE_H_CM)
        if px2_h != px1_h:
            slope_h = (cm2_h - cm1_h) / (px2_h - px1_h)
            intercept_h = cm1_h - (slope_h * px1_h)
        else:
            slope_h = cm1_h / px1_h if px1_h > 0 else 0.0
            intercept_h = 0.0

        return (slope_w, intercept_w), (slope_h, intercept_h)

    # 2. ระบบเดิม 1-Point Scaling (Fallback)
    scale_w = config.REF_WIDTH_CM / config.REF_WIDTH_PX
    if hasattr(config, 'REF_HEIGHT_CM') and hasattr(config, 'REF_HEIGHT_PX'):
        scale_h = config.REF_HEIGHT_CM / config.REF_HEIGHT_PX
    else:
        scale_h = scale_w
    return scale_w, scale_h

def pixel_to_cm(px, scale=None):
    """แปลงค่าพิกเซล (px) เป็นเซนติเมตร (cm) รองรับทั้ง 2-point, 1-point และ Focal"""
    if px is None or px <= 0:
        return 0.0

    if getattr(config, 'USE_FOCAL', False):
        return (px * config.DISTANCE_CM) / config.FOCAL_LENGTH_PX

    if scale is None:
        return float(px)

    # กรณี 2-Point Linear: scale คือ (slope, intercept)
    if isinstance(scale, (tuple, list)):
        slope, intercept = scale
        return max(0.0, float(px * slope + intercept))

    # กรณี 1-Point Scale: scale คือ float
    return max(0.0, float(px * scale))

def estimate_volume_ml(width_cm, height_cm):
    r = width_cm / 2.0
    volume = math.pi * (r ** 2) * height_cm
    return volume * config.CORRECTION_FACTOR

def classify_ml(volume_ml):
    for low, high, label in config.ML_RANGES:
        if low <= volume_ml < high:
            return label
    return "unknown"

class SizeEstimator:
    def get_size_ml(self, w_px, h_px):
        if h_px < config.MIN_HEIGHT_PX:
            return 150  # Default min size for very small detections

        scale_w, scale_h = get_scale()

        w_cm = pixel_to_cm(w_px, scale_w)
        h_cm = pixel_to_cm(h_px, scale_h)

        volume_ml = estimate_volume_ml(w_cm, h_cm)
        label = classify_ml(volume_ml)

        # Convert label back to integer so ScoreCalculator can calculate weight
        if isinstance(label, int) or (isinstance(label, str) and label.isdigit()):
            return int(label)
            
        return 500  # Fallback size

