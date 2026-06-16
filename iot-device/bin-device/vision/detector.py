from ultralytics import YOLO

# Mapping COCO class labels → SBAY types
# YOLOv8n ตรวจได้ 80 classes (COCO)
# เรา map เฉพาะ class ที่ใช้งานจริง
COCO_TO_SBAY = {
    "bottle": "CLEAR_BOTTLE",
    "wine glass": "GLASSES_BOTTLE",
    "cup": "ALUMINUM_CAN",
    "bowl": "STEEL_CAN",
    "vase": "OPAQUE_BOTTLE",
}


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
            coco_label = self.model.names[cls_id]

            # Map to SBAY type — skip if not in our mapping
            sbay_label = COCO_TO_SBAY.get(coco_label)
            if sbay_label is None:
                continue

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            height = y2 - y1

            detections.append({
                "label": sbay_label,
                "coco_label": coco_label,
                "height": height,
                "confidence": float(box.conf[0])
            })

        return detections