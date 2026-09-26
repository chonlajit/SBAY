import cv2
import numpy as np
from ultralytics import YOLO


class Detector:
    def __init__(self, model_path):
        self.model = YOLO(model_path)
        
        # แมปชื่อคลาสจากโมเดลเทรนเอง -> ชื่อมาตรฐานของระบบ SBAY
        self.label_mapping = {
            # 3 คลาสหลักที่คุณเทรนจริง
            "bottle": "PLASTIC_BOTTLE",
            "canned": "ALUMINUM_CAN",
            "milk": "BEVERAGE_CARTON",

            # 3 คลาสที่ติดมาจาก Dataset ต้นแบบ (ป้องกันกรณีโมเดลทายหลุด)
            "CrazyWolf": "ALUMINUM_CAN",
            "Hell": "ALUMINUM_CAN",
            "ba": "BEVERAGE_CARTON",
        }

    def _find_rotated_box(self, roi, x1, y1, x2, y2):
        """
        คำนวณหากรอบสี่เหลี่ยมเอียงตามมุมจริงของขวด (Oriented Bounding Box)
        โดยใช้การวิเคราะห์ Contour ภายในกรอบวัตถุของ YOLO
        """
        roi_h, roi_w = roi.shape[:2]
        if roi_h < 15 or roi_w < 15:
            box_pts = np.array([[x1, y1], [x2, y1], [x2, y2], [x1, y2]], dtype=np.int32)
            return box_pts, float(max(roi_h, roi_w)), float(min(roi_h, roi_w)), 0.0

        if len(roi.shape) == 3:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = roi

        # กรองสัญญาณรบกวน
        blur = cv2.GaussianBlur(gray, (5, 5), 0)

        # 1. ตรวจจับเฉพาะขอบที่คมชัด (ตัดขอบเงาจางๆ บนถาดดำออก)
        edges = cv2.Canny(blur, 50, 150)
        _, otsu = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # 2. ป้องกันขอบเงามืดลามเข้ามารวมกับตัวขวด
        kernel_sm = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        otsu_expanded = cv2.dilate(otsu, kernel_sm, iterations=1)
        valid_edges = cv2.bitwise_and(edges, otsu_expanded)
        combined = cv2.bitwise_or(valid_edges, otsu)

        # 3. Morphological Closing เพื่อเชื่อมเส้นรอบรูป โดยไม่ขยายขอบ (ไม่ Dilate) ให้กรอบบวม
        closed = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel_sm, iterations=2)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        roi_area = roi_w * roi_h
        valid_cnts = [c for c in contours if cv2.contourArea(c) > 0.05 * roi_area]

        if valid_cnts:
            all_pts = np.vstack(valid_cnts)
            hull = cv2.convexHull(all_pts)
            rect = cv2.minAreaRect(hull)
            (cx, cy), (dim1, dim2), angle = rect

            box_area = dim1 * dim2
            # ต้องมีพื้นที่ครอบคลุมอย่างน้อย 15% ของ ROI (รองรับขวดใสที่แสงสะท้อนน้อย)
            if box_area > 0.15 * roi_area:
                pts = cv2.boxPoints(rect)
                pts[:, 0] += x1
                pts[:, 1] += y1
                box_pts = np.int32(pts)

                true_height = max(dim1, dim2)
                true_width = min(dim1, dim2)

                # คำนวณองศาเทียบกับแนวตั้ง (-90 ถึง +90 องศา)
                tilt_deg = angle if dim1 < dim2 else angle + 90
                while tilt_deg > 90:
                    tilt_deg -= 180
                while tilt_deg < -90:
                    tilt_deg += 180

                return box_pts, true_height, true_width, tilt_deg

        # กรณีไม่สามารถคำนวณมุมได้ ให้ใช้กรอบสี่เหลี่ยมเดิม
        box_pts = np.array([[x1, y1], [x2, y1], [x2, y2], [x1, y2]], dtype=np.int32)
        return box_pts, float(max(roi_h, roi_w)), float(min(roi_h, roi_w)), 0.0

    def detect(self, frame):
        import settings.config as config
        use_rotated = getattr(config, 'USE_ROTATED_BBOX', True)

        # รัน YOLO
        results = self.model(
            frame,
            imgsz=320,
            conf=config.CONF_THRESHOLD,
            device="cpu",
            verbose=False
        )[0]

        # หากใช้กรอบเอียง ให้วาดบนภาพต้นฉบับ หากไม่ ให้ใช้ results.plot()
        if use_rotated:
            annotated_frame = frame.copy()
        else:
            annotated_frame = results.plot()

        detections = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            label_name = self.model.names[cls_id]
            conf_val = float(box.conf[0])

            # แปลงชื่อจาก Custom Model เป็นชื่อที่ระบบ Score ยอมรับ
            clean_name = str(label_name).strip()
            sbay_label = self.label_mapping.get(clean_name)
            if not sbay_label:
                for k, v in self.label_mapping.items():
                    if k.lower() == clean_name.lower():
                        sbay_label = v
                        break
            if not sbay_label:
                sbay_label = clean_name.upper()

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            # ป้องกันพิกัดหลุดขอบภาพ
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(frame.shape[1], x2)
            y2 = min(frame.shape[0], y2)

            if use_rotated:
                roi = frame[y1:y2, x1:x2]
                box_pts, height, width, tilt_deg = self._find_rotated_box(roi, x1, y1, x2, y2)
            else:
                height = y2 - y1
                width = x2 - x1
                tilt_deg = 0.0
                box_pts = np.array([[x1, y1], [x2, y1], [x2, y2], [x1, y2]], dtype=np.int32)

            # --- ดึงฟังก์ชันแปลง px -> cm มาใช้แสดงผล ---
            try:
                from size.estimator import get_scale, pixel_to_cm, estimate_volume_ml
                scale_w, scale_h = get_scale()
                w_cm = pixel_to_cm(width, scale_w)
                h_cm = pixel_to_cm(height, scale_h)
                vol = estimate_volume_ml(w_cm, h_cm)
                text_vol = f"V:{vol:.0f}ml"
            except Exception:
                w_cm = 0.0
                h_cm = 0.0
                vol = 0.0
                text_vol = ""

            # วาดกรอบเอียง (Oriented Bounding Box)
            if use_rotated:
                # 1. วาดกรอบสี่เหลี่ยมเอียงตามขวด (สีเขียวสว่างสดใส)
                cv2.polylines(annotated_frame, [box_pts], isClosed=True, color=(0, 255, 100), thickness=2)

                # 2. วาดจุดมาร์กเกอร์ 4 มุม
                for pt in box_pts:
                    cv2.circle(annotated_frame, (int(pt[0]), int(pt[1])), 3, (0, 255, 255), -1)

                # 3. จุดตำแหน่งป้ายกำกับ
                anchor_x = int(min(box_pts[:, 0]))
                anchor_y = int(min(box_pts[:, 1]))

                angle_str = f" ({abs(tilt_deg):.0f}deg)" if abs(tilt_deg) > 3 else ""
                if clean_name.lower() in sbay_label.lower():
                    display_label = sbay_label
                else:
                    display_label = f"{sbay_label} ({clean_name})"
                label_text = f"{display_label} {conf_val*100:.0f}%{angle_str}"
                size_text = f"W:{width:.0f}px({w_cm:.1f}cm) H:{height:.0f}px({h_cm:.1f}cm) {text_vol}"

                # วาดแถบพื้นหลังสีเข้มให้อ่านง่าย
                (tw1, th1), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
                (tw2, th2), _ = cv2.getTextSize(size_text, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
                max_tw = max(tw1, tw2)

                badge_y1 = max(5, anchor_y - th1 - th2 - 14)
                badge_y2 = badge_y1 + th1 + th2 + 12
                badge_x2 = min(annotated_frame.shape[1] - 5, anchor_x + max_tw + 12)

                # ป้ายพื้นหลังโปร่งแสง
                sub_img = annotated_frame[badge_y1:badge_y2, anchor_x:badge_x2]
                if sub_img.shape[0] > 0 and sub_img.shape[1] > 0:
                    black_rect = np.zeros(sub_img.shape, dtype=np.uint8)
                    res = cv2.addWeighted(sub_img, 0.25, black_rect, 0.75, 0)
                    annotated_frame[badge_y1:badge_y2, anchor_x:badge_x2] = res

                cv2.putText(annotated_frame, label_text, (anchor_x + 4, badge_y1 + th1 + 2),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 100), 1)
                cv2.putText(annotated_frame, size_text, (anchor_x + 4, badge_y2 - 3),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 255, 255), 1)
            else:
                # วาดแบบดั้งเดิม
                text1 = f"W:{width}px({w_cm:.1f}cm)"
                text2 = f"H:{height}px({h_cm:.1f}cm) | V:{vol:.0f}ml"
                text_y1 = y2 + 20 if y2 + 40 < annotated_frame.shape[0] else y2 - 30
                text_y2 = y2 + 40 if y2 + 40 < annotated_frame.shape[0] else y2 - 10
                cv2.putText(annotated_frame, text1, (x1, text_y1), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                cv2.putText(annotated_frame, text2, (x1, text_y2), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

            detections.append({
                "label": sbay_label,
                "coco_label": label_name,
                "height": int(height),
                "width": int(width),
                "angle": round(tilt_deg, 1),
                "confidence": conf_val
            })

        return detections, annotated_frame