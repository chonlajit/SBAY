from ultralytics import YOLO

class Detector:
    def __init__(self, model_path):
        self.model = YOLO(model_path)

    def detect(self, frame):
        results = self.model(
            frame,
            imgsz=320,
            conf=0.5,
            device="cpu",
            verbose=False
        )[0]

        detections = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            label = self.model.names[cls_id]

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            height = y2 - y1

            detections.append({
                "label": label,
                "height": height,
                "confidence": float(box.conf[0])
            })

        return detections