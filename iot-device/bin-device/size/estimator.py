import math
import config

def get_scale():
    if config.USE_FOCAL:
        return None
    return config.REF_WIDTH_CM / config.REF_WIDTH_PX

def pixel_to_cm(px, scale=None):
    if config.USE_FOCAL:
        return (px * config.DISTANCE_CM) / config.FOCAL_LENGTH_PX
    else:
        return px * scale

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

        scale = get_scale()

        w_cm = pixel_to_cm(w_px, scale)
        h_cm = pixel_to_cm(h_px, scale)

        volume_ml = estimate_volume_ml(w_cm, h_cm)
        label = classify_ml(volume_ml)

        # Convert label back to integer so ScoreCalculator can calculate weight
        if isinstance(label, int) or (isinstance(label, str) and label.isdigit()):
            return int(label)
            
        return 500  # Fallback size