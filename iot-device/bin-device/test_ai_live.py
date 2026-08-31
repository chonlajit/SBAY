import os
import sys
import time
import cv2

# เพิ่ม Path ให้มองเห็นโฟลเดอร์ปัจจุบัน
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import MODEL_PATH
from vision.detector import Detector

def nothing(x):
    pass

def main():
    print("="*50)
    print("🤖 เริ่มการทดสอบ AI แบบเรียลไทม์พร้อมปรับ GUI (Live Detection)")
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

    # สร้างหน้าต่างสำหรับปรับตั้งค่า (Trackbars)
    cv2.namedWindow("Settings")
    cv2.resizeWindow("Settings", 400, 250)
    
    # ค่าเริ่มต้น
    cv2.createTrackbar("Top (%)", "Settings", 25, 100, nothing)
    cv2.createTrackbar("Bottom (%)", "Settings", 75, 100, nothing)
    cv2.createTrackbar("Left (%)", "Settings", 33, 100, nothing)
    cv2.createTrackbar("Right (%)", "Settings", 67, 100, nothing)

    print("🎥 กำลังแสดงผลภาพสด... (กด 'q' ที่หน้าต่างภาพเพื่อออก)")
    print("👉 คุณสามารถปรับแถบเลื่อนในหน้าต่าง 'Settings' เพื่อดูผลลัพธ์การครอปภาพได้เลย")
    
    try:
        while True:
            # ดึงภาพจากกล้อง
            frame = picam.capture_array()
            
            # สลับสี BGR กลับเป็น RGB ตามที่โมเดลคาดหวัง
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            h, w = frame_rgb.shape[:2]

            # อ่านค่าจาก Trackbars
            top_pct = cv2.getTrackbarPos("Top (%)", "Settings")
            bottom_pct = cv2.getTrackbarPos("Bottom (%)", "Settings")
            left_pct = cv2.getTrackbarPos("Left (%)", "Settings")
            right_pct = cv2.getTrackbarPos("Right (%)", "Settings")

            # ป้องกันค่าติดลบ หรือค่าทับกัน (Top ต้องน้อยกว่า Bottom, Left ต้องน้อยกว่า Right)
            if top_pct >= bottom_pct:
                bottom_pct = min(top_pct + 1, 100)
                cv2.setTrackbarPos("Bottom (%)", "Settings", bottom_pct)
            if left_pct >= right_pct:
                right_pct = min(left_pct + 1, 100)
                cv2.setTrackbarPos("Right (%)", "Settings", right_pct)

            y1 = int(h * (top_pct / 100.0))
            y2 = int(h * (bottom_pct / 100.0))
            x1 = int(w * (left_pct / 100.0))
            x2 = int(w * (right_pct / 100.0))

            # ครอปภาพ (Crop) ตามค่าที่ปรับ
            cropped_frame = frame_rgb[y1:y2, x1:x2]

            # ถ้าพื้นที่ครอปเล็กเกินไปข้ามไปก่อน (ป้องกัน error)
            if cropped_frame.shape[0] < 10 or cropped_frame.shape[1] < 10:
                annotated_frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
                cv2.putText(annotated_frame_bgr, "Crop area too small!", (10, 50), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            else:
                # รัน AI บนภาพที่ครอปแล้ว
                detections, annotated_frame_rgb = detector.detect(cropped_frame)
                
                # แปลงสีกลับเป็น BGR สำหรับแสดงผลด้วย OpenCV
                annotated_frame_bgr = cv2.cvtColor(annotated_frame_rgb, cv2.COLOR_RGB2BGR)

                # แสดงข้อมูลค่าที่ตั้งไว้บนภาพ จะได้เอาไปเขียนโค้ดได้ง่ายๆ
                info_text1 = f"Found: {len(detections)}"
                info_text2 = f"Crop Y: {top_pct}% to {bottom_pct}%"
                info_text3 = f"Crop X: {left_pct}% to {right_pct}%"
                
                cv2.putText(annotated_frame_bgr, info_text1, (10, 30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                cv2.putText(annotated_frame_bgr, info_text2, (10, 60), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                cv2.putText(annotated_frame_bgr, info_text3, (10, 90), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

            # แสดงภาพสดที่ผ่านการครอปและมี Bounding Box
            cv2.imshow("AI Live Detection (Press 'q' to quit)", annotated_frame_bgr)

            # รอรับคำสั่งปุ่มกด (1 ms) และเช็คว่ากด 'q' หรือไม่
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("🛑 ได้รับคำสั่งหยุดการทำงาน...")
                # พิมพ์ค่าสุดท้ายให้ผู้ใช้ก๊อปปี้ไปใช้
                print("\n" + "="*40)
                print("📌 ค่าที่ปรับแต่งล่าสุดสำหรับนำไปใช้ในโค้ดจริง (เช่นใน config.py หรือ gui.py):")
                print(f"Top (y1):    {top_pct}%  -> int(h * {top_pct/100:.2f})")
                print(f"Bottom (y2): {bottom_pct}%  -> int(h * {bottom_pct/100:.2f})")
                print(f"Left (x1):   {left_pct}%  -> int(w * {left_pct/100:.2f})")
                print(f"Right (x2):  {right_pct}%  -> int(w * {right_pct/100:.2f})")
                print("="*40 + "\n")
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
