
//////////////////
pip install opencv-python requests  
////////////////

import base64
import threading
import cv2
import requests

API_KEY = "WBKNDm6hHvCiL4MqMrZl"
PROJECT_NAME = "sbay-project"
VERSION = 8

# ปรับ confidence และ overlap ให้ตรงกับแถบเลื่อนบนเว็บ Roboflow (เช่น conf=30, overlap=50)
ROBOFLOW_URL = (
    f"https://detect.roboflow.com/{PROJECT_NAME}/{VERSION}"
    f"?api_key={API_KEY}&confidence=45&overlap=50"
)

is_requesting = False
last_predictions = []
lock = threading.Lock()

def detect_thread(frame_to_send, orig_w, orig_h):
    global is_requesting, last_predictions
    try:
        # 1. แปลงสี BGR เป็น RGB ให้ตรงกับสภาพแวดล้อมที่โมเดลเทรนมา
        rgb_frame = cv2.cvtColor(frame_to_send, cv2.COLOR_BGR2RGB)
        
        # 2. ปรับขนาดภาพเป็น 640x640 (ขนาดมาตรฐาน YOLO) เพื่อเก็บดีเทลวัตถุ
        input_w, input_h = 640, 640
        resized_frame = cv2.resize(rgb_frame, (input_w, input_h))
        
        # 3. แปลงกลับเป็น BGR ก่อน encode (เพราะ cv2.imencode คาดหวัง BGR)
        bgr_ready = cv2.cvtColor(resized_frame, cv2.COLOR_RGB2BGR)
        
        # 4. บีบอัดภาพด้วยคุณภาพสูง (95%) เพื่อไม่ให้ลายละเอียดแตก
        _, buffer = cv2.imencode('.jpg', bgr_ready, [cv2.IMWRITE_JPEG_QUALITY, 95])
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        res = requests.post(
            ROBOFLOW_URL,
            data=img_base64,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=5
        )
        data = res.json()

        if "predictions" in data:
            scale_x = orig_w / input_w
            scale_y = orig_h / input_h
            scaled_preds = []
            for pred in data["predictions"]:
                pred["x"] *= scale_x
                pred["y"] *= scale_y
                pred["width"] *= scale_x
                pred["height"] *= scale_y
                scaled_preds.append(pred)

            with lock:
                last_predictions = scaled_preds
    except Exception as e:
        print(f"Error: {e}")
    finally:
        is_requesting = False

# ส่วนกล้องหลัก
cap = cv2.VideoCapture(0)
# แนะนำ: ตั้งค่าความละเอียดกล้องให้อยู่ในระดับมาตรฐาน 720p เพื่อความคมชัด
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

print("เริ่มการตรวจจับ... กด 'q' เพื่อปิด")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    h, w, _ = frame.shape

    if not is_requesting:
        is_requesting = True
        t = threading.Thread(target=detect_thread, args=(frame.copy(), w, h), daemon=True)
        t.start()

    with lock:
        current_predictions = list(last_predictions)

    for pred in current_predictions:
        x = int(pred["x"])
        y = int(pred["y"])
        bw = int(pred["width"])
        bh = int(pred["height"])
        label = f"{pred['class']} {pred['confidence']:.2f}"

        x1 = int(x - bw / 2)
        y1 = int(y - bh / 2)
        x2 = int(x + bw / 2)
        y2 = int(y + bh / 2)

        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, label, (x1, max(y1 - 10, 20)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    cv2.imshow("Roboflow Camera Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()