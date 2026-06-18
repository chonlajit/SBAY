import cv2
from ultralytics import YOLO

class Detector:
    def __init__(self, model_path):
        self.model = YOLO(model_path)
        
        # แมปชื่อคลาสจากโมเดลเทรนเอง -> ชื่อคงที่ใน config.py (PRICE_PER_KG)
        self.label_mapping = {
            "Clear Plastic": "CLEAR_BOTTLE",
            "canned": "ALUMINUM_CAN",
            "Opaque Plastic": "OPAQUE_BOTTLE",
            "Glass": "GLASSES_BOTTLE",
            "Bottle": "CLEAR_BOTTLE",
            "Can": "ALUMINUM_CAN"
        }

    def detect(self, frame):
        # รัน YOLO และใช้ผลลัพธ์วาดกรอบแบบออริจินัล (results.plot())
        results = self.model(
            frame,
            imgsz=320,
            conf=0.45,
            device="cpu",
            verbose=False
        )[0]
        
        annotated_frame = results.plot()

        detections = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            label_name = self.model.names[cls_id]

            # แปลงชื่อจาก Custom Model เป็นชื่อที่ระบบ Score ยอมรับ
            # ถ้าไม่ตรงเลย จะพยายามทำให้เป็นตัวพิมพ์ใหญ่และแทนที่ช่องว่างด้วย _ เผื่อฟลุ๊คตรง
            sbay_label = self.label_mapping.get(label_name)
            if not sbay_label:
                # Fallback: เช่น "Clear Plastic" -> "CLEAR_PLASTIC" (ถ้ามีใน config จะรอด)
                # แต่ถ้าไม่มี จะถูกตั้งเป็น CLEAR_BOTTLE เพื่อกันแอปเด้ง (KeyError)
                sbay_label = "CLEAR_BOTTLE"

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            height = y2 - y1
            width = x2 - x1

            # --- วาดค่า Width และ Height (Pixel) ลงบนกรอบ Bbox เพื่อให้ง่ายต่อการ Calibrate ---
            text = f"W: {width}px | H: {height}px"
            # วาดตรงด้านล่างกรอบ (ถ้าขอบล่างเลยกรอบภาพไป ให้วาดด้านในแทน)
            text_y = y2 + 20 if y2 + 20 < annotated_frame.shape[0] else y2 - 10
            # สีเหลือง (0, 255, 255) ขนาดตัวอักษร 0.6 ความหนาเส้น 2
            cv2.putText(annotated_frame, text, (x1, text_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

            detections.append({
                "label": sbay_label,
                "coco_label": label_name,
                "height": height,
                "width": width,
                "confidence": float(box.conf[0])
            })

        return detections, annotated_frame