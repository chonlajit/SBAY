from ultralytics import YOLO

class Detector:
    def __init__(self, model_path):
        self.model = YOLO(model_path)

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

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            height = y2 - y1

            detections.append({
                "label": label_name,
                "coco_label": label_name,
                "height": height,
                "confidence": float(box.conf[0])
            })

        return detections, annotated_frame