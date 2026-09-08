import cv2
import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk
import os
import sys
import time
import datetime
from dotenv import load_dotenv

# โหลดค่าจากไฟล์ .env
load_dotenv()

# โหลดค่าการครอบภาพ (Crop) จาก config.py
try:
    from config import CROP_TOP_PCT, CROP_BOTTOM_PCT, CROP_LEFT_PCT, CROP_RIGHT_PCT
except ImportError:
    CROP_TOP_PCT, CROP_BOTTOM_PCT, CROP_LEFT_PCT, CROP_RIGHT_PCT = 0.0, 1.0, 0.0, 1.0

# ดึงค่าขนาดหน้าจอจาก .env ถ้าไม่มีใช้ค่าเริ่มต้น
WINDOW_WIDTH = int(os.getenv("WINDOW_WIDTH", "800"))
WINDOW_HEIGHT = int(os.getenv("WINDOW_HEIGHT", "480"))
IS_FULLSCREEN = str(os.getenv("GUI_FULLSCREEN", "false")).lower() == "true"
CAMERA_ROTATION = int(os.getenv("CAMERA_ROTATION", "0")) # 0, 90, 180, 270

class DataCollectorApp:
    def __init__(self, root, window_title):
        self.root = root
        self.root.title(window_title)
        self.root.configure(bg="#1e293b")
        
        if IS_FULLSCREEN:
            try:
                self.root.attributes("-fullscreen", True)
            except:
                pass
        else:
            self.root.geometry(f"{WINDOW_WIDTH}x{WINDOW_HEIGHT}")

        # โฟลเดอร์สำหรับเก็บรูป
        self.base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "photos")
        self.categories = ["plastic", "can", "carton"]
        
        # สร้างโฟลเดอร์ถ้ายังไม่มี
        for cat in self.categories:
            os.makedirs(os.path.join(self.base_dir, cat), exist_ok=True)

        self.selected_category = tk.StringVar(value=self.categories[0])
        self.auto_capture = tk.BooleanVar(value=False)

        # เริ่มต้นกล้องผ่าน Picamera2 แทน OpenCV ธรรมดาเพื่อให้เข้ากับระบบ Pi ใหม่ๆ
        self.picam = None
        try:
            from picamera2 import Picamera2
        except Exception as e:
            messagebox.showerror("Error", f"ไม่สามารถเปิดกล้อง Picamera2 ได้:\n{e}")
            print(f"❌ Error starting camera: {e}")
            
        self.swap_color = tk.BooleanVar(value=True) # ค่าเริ่มต้นให้สลับสี
        
        # UI Elements
        self.setup_ui()

        # ตัวแปรสำหรับ Auto capture
        self.last_frame_gray = None
        self.motion_detected_time = time.time()
        self.still_time_required = 1.5 # ต้องอยู่นิ่งกี่วินาทีถึงจะถ่าย
        self.last_capture_time = 0

        self.delay = 15 # ms
        self.update_frame()

    def setup_ui(self):
        # แถบควบคุมด้านบน
        control_frame = tk.Frame(self.root, pady=15, bg="#0f172a")
        control_frame.pack(fill=tk.X, side=tk.TOP)

        # หมวดหมู่
        lbl_cat = tk.Label(control_frame, text="เลือกโฟลเดอร์:", font=("Helvetica", 16, "bold"), bg="#0f172a", fg="white")
        lbl_cat.pack(side=tk.LEFT, padx=15)
        
        for cat in self.categories:
            rb = tk.Radiobutton(
                control_frame, 
                text=cat.capitalize(), 
                variable=self.selected_category, 
                value=cat, 
                font=("Helvetica", 16),
                bg="#0f172a", fg="white", selectcolor="#334155",
                indicatoron=0, width=8, height=1
            )
            rb.pack(side=tk.LEFT, padx=5)

        # ปุ่มกดและ Auto
        self.btn_capture = tk.Button(
            control_frame, text="📸 Capture", command=self.capture, 
            font=("Helvetica", 16, "bold"), bg="#22c55e", fg="white", 
            padx=10, relief="flat"
        )
        self.btn_capture.pack(side=tk.RIGHT, padx=10)
        
        self.chk_color = tk.Checkbutton(
            control_frame, text="สลับสี (แก้สีเพี้ยน)", 
            variable=self.swap_color, font=("Helvetica", 14),
            bg="#0f172a", fg="white", selectcolor="#334155"
        )
        self.chk_color.pack(side=tk.RIGHT, padx=5)
        
        self.chk_auto = tk.Checkbutton(
            control_frame, text="🤖 Auto Capture", 
            variable=self.auto_capture, font=("Helvetica", 14),
            bg="#0f172a", fg="white", selectcolor="#334155"
        )
        self.chk_auto.pack(side=tk.RIGHT, padx=5)

        # พื้นที่แสดงวิดีโอ
        self.canvas = tk.Canvas(self.root, bg="black")
        self.canvas.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

    def get_rotated_frame(self, frame):
        if CAMERA_ROTATION == 90:
            return cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        elif CAMERA_ROTATION == 180:
            return cv2.rotate(frame, cv2.ROTATE_180)
        elif CAMERA_ROTATION == 270:
            return cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
        return frame

    def get_cropped_frame(self, frame):
        h, w = frame.shape[:2]
        y1 = int(h * CROP_TOP_PCT)
        y2 = int(h * CROP_BOTTOM_PCT)
        x1 = int(w * CROP_LEFT_PCT)
        x2 = int(w * CROP_RIGHT_PCT)
        
        # ป้องกัน error จากค่าผิดพลาด
        if y1 >= y2 or x1 >= x2 or y2 > h or x2 > w:
            return frame 
            
        return frame[y1:y2, x1:x2]

    def update_frame(self):
        if self.picam is None:
            # ถ้ากล้องไม่ทำงานให้หยุดการอัปเดตเฟรม
            return
            
        try:
            # ดึงภาพจาก Picamera2
            frame = self.picam.capture_array()
        except Exception as e:
            print("Capture error:", e)
            self.root.after(self.delay, self.update_frame)
            return

        frame = self.get_rotated_frame(frame)
        frame = self.get_cropped_frame(frame)
        current_time = time.time()
        
        # --- ตรรกะ Auto Capture ---
        if self.auto_capture.get() and (current_time - self.last_capture_time > 2.0): # ป้องกันถ่ายรัวเกินไป
            gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)
            
            if self.last_frame_gray is not None:
                frame_delta = cv2.absdiff(self.last_frame_gray, gray)
                thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
                
                motion_level = cv2.countNonZero(thresh)
                
                if motion_level > 500: 
                    self.motion_detected_time = current_time
                else:
                    if current_time - self.motion_detected_time > self.still_time_required:
                        self.capture(frame=frame)
                        self.motion_detected_time = current_time
                        
            self.last_frame_gray = gray

        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        display_frame = frame.copy()
        
        # ปรับขนาดภาพให้พอดีกับ Canvas โดยรักษาอัตราส่วน
        if canvas_width > 10 and canvas_height > 10:
            h, w = display_frame.shape[:2]
            scale = min(canvas_width / w, canvas_height / h)
            new_w, new_h = int(w * scale), int(h * scale)
            display_frame = cv2.resize(display_frame, (new_w, new_h))
            
        # ค่อยวาดข้อความลงบนภาพที่ปรับขนาดแล้ว จะได้สัมพันธ์กับหน้าจอ
        # คำนวณขนาดตัวหนังสือตามความกว้างของภาพที่แสดง (อ้างอิงจาก 800px)
        font_scale = max(0.5, (display_frame.shape[1] / 800.0) * 1.0)
        thickness = max(1, int(font_scale * 2))
        
        if self.auto_capture.get():
            is_still = (current_time - self.motion_detected_time > 0.5)
            status_text = "AUTO: " + ("STILL" if is_still else "MOTION")
            color = (0, 255, 0) if is_still else (255, 0, 0)
            cv2.putText(display_frame, status_text, (20, int(40 * font_scale)), cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness)
        
        cv2.putText(display_frame, f"Save to: {self.selected_category.get()}", (20, int(80 * font_scale) + 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 255, 255), thickness)

        if self.swap_color.get():
            display_frame = cv2.cvtColor(display_frame, cv2.COLOR_BGR2RGB)

        self.photo = ImageTk.PhotoImage(image=Image.fromarray(display_frame))
        
        if canvas_width > 10:
            x = (canvas_width - display_frame.shape[1]) // 2
            y = (canvas_height - display_frame.shape[0]) // 2
            self.canvas.create_image(max(0, x), max(0, y), image=self.photo, anchor=tk.NW)
        else:
            self.canvas.create_image(0, 0, image=self.photo, anchor=tk.NW)

        self.root.after(self.delay, self.update_frame)

    def capture(self, frame=None):
        if frame is None:
            if self.picam:
                try:
                    frame = self.picam.capture_array()
                    frame = self.get_rotated_frame(frame)
                    frame = self.get_cropped_frame(frame)
                except Exception as e:
                    print("Error manual capture:", e)
                    return
            else:
                return
                
        cat = self.selected_category.get()
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        filename = f"{cat}_{timestamp}.jpg"
        filepath = os.path.join(self.base_dir, cat, filename)
        
        if self.swap_color.get():
            frame_to_save = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        else:
            frame_to_save = frame
            
        cv2.imwrite(filepath, frame_to_save)
        self.last_capture_time = time.time()
        print(f"✅ บันทึกรูป: {filepath}")
        
        # ทำหน้าจอกระพริบ (Feedback)
        original_bg = self.canvas.cget("bg")
        self.canvas.configure(bg="white")
        self.root.after(100, lambda: self.canvas.configure(bg=original_bg))

    def __del__(self):
        if hasattr(self, 'picam') and self.picam is not None:
            self.picam.stop()

if __name__ == "__main__":
    root = tk.Tk()
    app = DataCollectorApp(root, "SBAY Image Data Collector")
    
    # กด ESC เพื่อออก
    root.bind("<Escape>", lambda e: root.destroy())
    
    root.mainloop()
