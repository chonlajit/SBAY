import cv2
import time
from collections import deque

from vision.detector import Detector
from size.estimator import SizeEstimator
from scoring.calculator import ScoreCalculator

# =========================
# MODE
# =========================
USE_HARDWARE = False  # True = Raspberry Pi / False = PC

# =========================
# HARDWARE / MOCK
# =========================
if USE_HARDWARE:
    from hardware.infrared import is_detected
    from hardware.servo import sort_item, release_item, cleanup
else:
    def is_detected():
        return True

    def sort_item(label):
        print(f"[SIMULATE] sort → {label}")

    def release_item():
        print("[SIMULATE] release")

    def cleanup():
        pass

# =========================
# INIT
# =========================
detector = Detector("yolov8n.pt")
size_estimator = SizeEstimator()
calculator = ScoreCalculator()

cap = cv2.VideoCapture(0)

# =========================
# CONFIG
# =========================
CONF_THRESHOLD = 0.7
STABLE_FRAMES = 5
COOLDOWN = 3
DETECT_TIMEOUT = 5

heights_buffer = deque(maxlen=5)
labels_buffer = deque(maxlen=5)

# =========================
# MAIN LOOP
# =========================
try:
    while True:

        # =========================
        # IDLE → รอ Infrared
        # =========================
        if USE_HARDWARE:
            if not is_detected():
                time.sleep(0.05)
                continue
            print("Object detected by IR")

        # =========================
        # DETECT PHASE
        # =========================
        detect_start = time.time()

        while True:
            ret, frame = cap.read()

            if not ret:
                print("Camera lost, retrying...")
                cap.release()
                time.sleep(1)
                cap = cv2.VideoCapture(0)
                break

            frame = cv2.resize(frame, (320, 320))

            # วาด ROI
            cv2.rectangle(frame, (50, 100), (270, 300), (0, 255, 0), 2)

            roi = frame[100:300, 50:270]
            detections = detector.detect(roi)

            # =========================
            # TIMEOUT
            # =========================
            if time.time() - detect_start > DETECT_TIMEOUT:
                print("Detect timeout")
                heights_buffer.clear()
                labels_buffer.clear()
                break

            # =========================
            # NO DETECTION
            # =========================
            if len(detections) == 0:
                heights_buffer.clear()
                labels_buffer.clear()
                continue

            # =========================
            # PICK BEST OBJECT
            # =========================
            d = max(detections, key=lambda x: x["confidence"])

            label = d["label"]
            height = d["height"]
            conf = d["confidence"]

            if conf < CONF_THRESHOLD:
                continue

            heights_buffer.append(height)
            labels_buffer.append(label)

            if len(heights_buffer) < STABLE_FRAMES:
                continue

            if len(set(labels_buffer)) != 1:
                continue

            # =========================
            # PROCESS
            # =========================
            stable_label = labels_buffer[-1]
            avg_height = sum(heights_buffer) / len(heights_buffer)

            size_ml = size_estimator.get_size_ml(avg_height)
            result = calculator.calculate(stable_label, size_ml)

            data = {
                "type": stable_label,
                "size_ml": size_ml,
                "weight": result["weight"],
                "score": result["score"],
                "timestamp": int(time.time())
            }

            print("[DETECTED]", data)

            # =========================
            # ACTION
            # =========================
            sort_item(stable_label)
            time.sleep(0.5)
            release_item()

            # reset buffer
            heights_buffer.clear()
            labels_buffer.clear()

            break  # ออกจาก detect loop

        # =========================
        # SHOW (ใช้เฉพาะตอน dev)
        # =========================
        cv2.imshow("SBAY Detection", frame)

        if cv2.waitKey(1) & 0xFF == 27:
            break

        # =========================
        # COOLDOWN
        # =========================
        time.sleep(COOLDOWN)

except KeyboardInterrupt:
    print("Stopped by user")

# =========================
# CLEANUP
# =========================
finally:
    cap.release()
    cleanup()
    cv2.destroyAllWindows()