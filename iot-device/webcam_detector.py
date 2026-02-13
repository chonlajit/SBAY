import cv2
import time
import requests
import os
from ultralytics import YOLO

# Configuration
# Force 127.0.0.1 to avoid Windows localhost/IPv6 issues and env var conflicts
BACKEND_URL = "http://127.0.0.1:8080/api"
MACHINE_ID = os.getenv("MACHINE_ID", "BIN-001")
CONFIDENCE_THRESHOLD = 0.70
COOLDOWN_SECONDS = 3.0
CONSECUTIVE_FRAMES_REQUIRED = 5  # Must detect same item X times in a row

# Load YOLOv8n model
print("Loading YOLOv8n model...")
model = YOLO('yolov8n.pt')

# Waste Mapping (COCO classes) to System Types
# Note: Standard YOLOv8n only knows 'bottle', 'cup', etc.
# We map similar shapes for testing purposes:
# 39: bottle -> CLEAR_BOTTLE (Standard)
# 40: wine glass -> OPAQUE_BOTTLE (Test: Use a glass/opaque object)
# 41: cup -> ALUMINUM_CAN (Standard)
# 45: bowl -> STEEL_CAN (Test: Use a bowl/can shape)
CLASS_MAPPING = {
    39: "CLEAR_BOTTLE", 
    40: "OPAQUE_BOTTLE",
    41: "ALUMINUM_CAN",
    45: "STEEL_CAN"
}

def get_machine_status():
    try:
        url = f"{BACKEND_URL}/machine/{MACHINE_ID}/status"
        resp = requests.get(url)
        if resp.status_code == 200:
            return resp.json().get("status", "IDLE")
    except Exception as e:
        print(f"Connection Error: {e}")
    return "IDLE"

def send_recycle_event(item_type):
    try:
        url = f"{BACKEND_URL}/machine/recycle"
        payload = {"type": item_type, "machineId": MACHINE_ID}
        print(f"Sending: {payload} to {url}")
        resp = requests.post(url, json=payload)
        if resp.status_code == 200:
            print(" -> Success: Points recorded")
        else:
            print(f" -> Failed: {resp.text}")
    except Exception as e:
        print(f" -> Error sending request: {e}")

def main():
    print(f"Starting Smart Recycle Bin System")
    print(f"Backend: {BACKEND_URL}")
    print(f"Machine ID: {MACHINE_ID}")
    
    cap = None
    last_detection_time = 0
    is_active = False

    # Stability Tracking
    consecutive_count = 0
    last_detected_class = None
    
    # Increase stability requirement
    REQUIRED_FRAMES = 2
    INFERENCE_INTERVAL = 1.0 # Check every 1 second
    last_inference_time = 0
    cached_results = []
    current_frame_item = None # Persist for drawing

    while True:
        # Check Status
        status = get_machine_status()
        
        if status == "ACTIVE":
            if not is_active:
                print(" -> USER LOGGED IN! Starting Camera...")
                cap = cv2.VideoCapture(0)
                is_active = True
                cv2.namedWindow("Smart Recycle Bin", cv2.WINDOW_NORMAL)
                consecutive_count = 0
                last_detected_class = None
                last_inference_time = 0
            
            if cap is not None and cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    height, width, _ = frame.shape
                    current_time = time.time()
                    
                    # Define Region of Interest (ROI) - Center Box
                    roi_size = 300
                    roi_x1 = (width - roi_size) // 2
                    roi_y1 = (height - roi_size) // 2
                    roi_x2 = roi_x1 + roi_size
                    roi_y2 = roi_y1 + roi_size
                    
                    # Draw ROI Box (Blue)
                    cv2.rectangle(frame, (roi_x1, roi_y1), (roi_x2, roi_y2), (255, 0, 0), 2)
                    cv2.putText(frame, "Place Item Here", (roi_x1, roi_y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

                    # INFERENCE LIMITER (1 Check / Second)
                    if current_time - last_inference_time >= INFERENCE_INTERVAL:
                        # Run Inference
                        results = model(frame, verbose=False)
                        cached_results = results # Cache for drawing
                        last_inference_time = current_time
                        
                        # Process Detection Logic (Only once per second)
                        current_frame_item = None
                        for result in results:
                            boxes = result.boxes
                            for box in boxes:
                                cls_id = int(box.cls[0])
                                conf = float(box.conf[0])
                                
                                if conf > CONFIDENCE_THRESHOLD:
                                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                                    if (roi_x1 < cx < roi_x2) and (roi_y1 < cy < roi_y2) and (cls_id in CLASS_MAPPING):
                                        current_frame_item = CLASS_MAPPING[cls_id]
                                        break
                            if current_frame_item: break

                        # Stability Check Update
                        if current_frame_item:
                            if current_frame_item == last_detected_class:
                                consecutive_count += 1
                            else:
                                consecutive_count = 1
                                last_detected_class = current_frame_item
                        else:
                            consecutive_count = 0
                            last_detected_class = None

                    # --- DRAWING (Every valid frame) ---
                    # Re-draw last known detections
                    if cached_results:
                        for result in cached_results:
                            boxes = result.boxes
                            for box in boxes:
                                cls_id = int(box.cls[0])
                                conf = float(box.conf[0])
                                
                                # ONLY draw if it is in our interested classes
                                if conf > CONFIDENCE_THRESHOLD and cls_id in CLASS_MAPPING:
                                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                                    label = model.names[cls_id]
                                    
                                    is_in_roi = (roi_x1 < cx < roi_x2) and (roi_y1 < cy < roi_y2)
                                    color = (0, 255, 255) if is_in_roi else (100, 100, 100)
                                    
                                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                                    cv2.putText(frame, f"{label} {conf:.2f}", (x1, y1 - 10), 
                                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                    
                    # UI Status Text
                    if last_detected_class and consecutive_count > 0:
                        progress_text = f"Verifying: {last_detected_class} {consecutive_count}/{REQUIRED_FRAMES}"
                        cv2.putText(frame, progress_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

                        # ACTION: Confirm if count reached
                        if consecutive_count >= REQUIRED_FRAMES:
                             # Send Event logic handled? We need to prevent spamming.
                             # If we just reached frame 3, send once.
                             pass # Logic below handles send
                    else:
                        cv2.putText(frame, "Waiting for item...", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)


                    # Send Event Check (Using 'processed' flag to avoid loop-send?)
                    # Or just check timestamp + has detected_item
                    # Simplification: If we just hit the count, trigger valid item
                    detected_item_to_send = None
                    if consecutive_count >= REQUIRED_FRAMES:
                        detected_item_to_send = last_detected_class

                    if detected_item_to_send and (current_time - last_detection_time > COOLDOWN_SECONDS):
                        print(f"Detected Valid Item: {detected_item_to_send}")
                        send_recycle_event(detected_item_to_send)
                        last_detection_time = current_time
                        
                        # Confirmed Visual (Green)
                        cv2.putText(frame, f"CONFIRMED: {detected_item_to_send}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
                        
                        # Reset counter
                        consecutive_count = 0
                        last_detected_class = None

                    cv2.imshow("Smart Recycle Bin", frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                else:
                    print("Failed to read camera frame")
        else:
            # IDLE STATE
            if is_active:
                print(" -> User Logged Out. Stopping Camera...")
                if cap:
                    cap.release()
                cv2.destroyAllWindows()
                is_active = False
            
            print("Waiting for user login... (checking in 1s)", end='\r')
            time.sleep(1)

    if cap:
        cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
