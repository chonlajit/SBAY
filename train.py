from ultralytics import YOLO

# โหลดโมเดลเริ่มต้น (สามารถเปลี่ยนเป็น yolov8m หรือ เอไอตัวอื่นได้)
model = YOLO('runs/detect/bottle-v1/weights/best.pt')
# เทรนโมเดล
model.train(
    data="data.yaml",
    epochs=200,
    imgsz=640,
    batch=32,
    name='bottle-v4'
)