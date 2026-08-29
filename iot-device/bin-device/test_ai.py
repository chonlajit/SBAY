import os
import sys
import time
import cv2

# เพิ่ม Path ให้มองเห็นโฟลเดอร์ปัจจุบัน
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import MODEL_PATH
from vision.detector import Detector

print("="*50)
print("🤖 เริ่มการทดสอบ AI (YOLO Detection)")
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
    cfg = picam.create_preview_configuration(main={"format": "BGR888", "size": (3280, 2464)})
    picam.configure(cfg)
    picam.start()
    time.sleep(2)  # วอร์มกล้อง
    print("✅ เปิดกล้องสำเร็จ!")
except Exception as e:
    print(f"❌ เปิดกล้องไม่สำเร็จ: {e}")
    sys.exit(1)

print("📸 กำลังถ่ายภาพและวิเคราะห์ด้วย AI...")
try:
    frame = picam.capture_array()
    
    # สลับสี BGR กลับเป็น RGB ตามที่โมเดลคาดหวัง
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # ครอปภาพ (Crop) ให้เหมือนกับตอนที่ระบบจริงทำงาน
    h, w = frame.shape[:2]
    y1, y2 = int(h * 0.25), int(h * 0.75)
    x1, x2 = int(w * 0.33), int(w * 0.67)
    frame = frame[y1:y2, x1:x2]

    # รัน AI
    start_time = time.time()
    detections, annotated_frame = detector.detect(frame)
    end_time = time.time()
    
    print(f"⏱️ ใช้เวลาวิเคราะห์: {end_time - start_time:.2f} วินาที")
    
    if len(detections) == 0:
        print("🤷‍♂️ ไม่พบขวดหรือกระป๋องในภาพครับ")
    else:
        print(f"🎯 พบวัตถุทั้งหมด {len(detections)} ชิ้น:")
        for i, det in enumerate(detections):
            print(f"  {i+1}. ประเภท: {det['label']} (มั่นใจ {det['confidence']*100:.1f}%) | ขนาด W:{det['width']}px H:{det['height']}px")
    
    # บันทึกภาพผลลัพธ์ลงเครื่อง
    output_path = "test_ai_result.jpg"
    
    # แปลงสีกลับเป็น BGR ก่อนเซฟด้วย cv2
    save_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_RGB2BGR)
    cv2.imwrite(output_path, save_frame)
    
    print("="*50)
    print(f"🖼️ บันทึกภาพผลลัพธ์พร้อมกรอบ AI ไว้ที่ไฟล์: {output_path}")
    print("👉 คุณสามารถเปิดดูไฟล์นี้เพื่อเช็คว่า AI ตีกรอบแม่นยำแค่ไหนครับ!")
    print("="*50)

except Exception as e:
    print(f"❌ เกิดข้อผิดพลาดขณะวิเคราะห์ภาพ: {e}")
finally:
    if picam:
        picam.stop()
    print("🧹 ปิดกล้องเรียบร้อย")
