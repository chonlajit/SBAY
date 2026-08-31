import os
import sys
import time
import cv2

# เพิ่ม Path ให้มองเห็นโฟลเดอร์ปัจจุบัน
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import MODEL_PATH
from vision.detector import Detector

def main():
    print("="*50)
    print("🤖 เริ่มการทดสอบ AI แบบเรียลไทม์ (Live Detection)")
    print("="*50)

    print(f"📦 กำลังโหลดโมเดล: {MODEL_PATH} ...")
    try:
        detector = Detector(MODEL_PATH)
        print("✅ โหลดโมเดลสำเร็จ!")
    except Exception as e:
        print(f"❌ โหลดโมเดลไม่สำเร็จ: {e}")
        sys.exit(1)

    print("⏳ กำลังเปิดกล้อง...")
    picam = None
    try:
        from picamera2 import Picamera2
        picam = Picamera2()
        # ใช้ความละเอียดที่เล็กลงหน่อยสำหรับการรันแบบเรียลไทม์ เพื่อให้ FPS ดีขึ้น
        cfg = picam.create_preview_configuration(main={"format": "BGR888", "size": (1280, 720)})
        picam.configure(cfg)
        picam.start()
        time.sleep(2)  # วอร์มกล้อง
        print("✅ เปิดกล้องสำเร็จ!")
    except Exception as e:
        print(f"❌ เปิดกล้องไม่สำเร็จ: {e}")
        sys.exit(1)

    print("🎥 กำลังแสดงผลภาพสด... (กด 'q' ที่หน้าต่างภาพเพื่อออก)")
    try:
        while True:
            # ดึงภาพจากกล้อง
            frame = picam.capture_array()
            
            # สลับสี BGR กลับเป็น RGB ตามที่โมเดลคาดหวัง
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # ครอปภาพ (Crop) ให้เหมือนกับตอนที่ระบบจริงทำงาน
            h, w = frame_rgb.shape[:2]
            y1, y2 = int(h * 0.25), int(h * 0.75)
            x1, x2 = int(w * 0.33), int(w * 0.67)
            cropped_frame = frame_rgb[y1:y2, x1:x2]

            # รัน AI บนภาพที่ครอปแล้ว
            detections, annotated_frame_rgb = detector.detect(cropped_frame)
            
            # แปลงสีกลับเป็น BGR สำหรับแสดงผลด้วย OpenCV
            annotated_frame_bgr = cv2.cvtColor(annotated_frame_rgb, cv2.COLOR_RGB2BGR)

            # แสดงผลจำนวนวัตถุที่เจอลงบนภาพ
            cv2.putText(annotated_frame_bgr, f"Found: {len(detections)}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

            # แสดงภาพสดที่มี Bounding Box
            cv2.imshow("AI Live Detection (Press 'q' to quit)", annotated_frame_bgr)

            # รอรับคำสั่งปุ่มกด (1 ms) และเช็คว่ากด 'q' หรือไม่
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("🛑 ได้รับคำสั่งหยุดการทำงาน...")
                break

    except KeyboardInterrupt:
        print("\n🛑 หยุดการทำงานโดยผู้ใช้ (Ctrl+C)")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดขณะวิเคราะห์ภาพ: {e}")
    finally:
        if picam:
            picam.stop()
        cv2.destroyAllWindows()
        print("🧹 ปิดกล้องและหน้าต่างเรียบร้อย")

if __name__ == "__main__":
    main()
