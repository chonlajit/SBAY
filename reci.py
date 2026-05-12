import cv2 
from ultralytics import YOLO 
 
model = YOLO("runs/detect/bottle-v1-3/weights/best.pt")     # โหลดโมเดลเล็ก/เร็ว 
cap = cv2.VideoCapture(0)      # เปิดกล้อง 
 
while True: 
    ok, frame = cap.read() 
    if not ok: break 
 
    results = model(frame, conf=0.5)  # ให้โมเดลทำนาย 
    for r in results: 
        for b in r.boxes: 
            x1,y1,x2,y2 = map(int, b.xyxy[0].tolist()) 
            cls = int(b.cls[0]); conf = float(b.conf[0]) 
            label = f"{model.names[cls]} {conf:.2f}" 
            cv2.rectangle(frame,(x1,y1),(x2,y2),(0,255,0),2) 
            cv2.putText(frame,label,(x1,max(20,y1-6)), 
                        cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,255,0),2) 
 
    cv2.imshow("YOLOv8 — Press q to quit", frame) 
    if cv2.waitKey(1) & 0xFF == ord('q'): break 
 
cap.release(); cv2.destroyAllWindows()