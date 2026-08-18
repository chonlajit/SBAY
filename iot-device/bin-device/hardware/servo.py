import time
import os
import sys
from gpiozero import AngularServo
from gpiozero.pins.lgpio import LGPIOFactory
from gpiozero import Device

# ตั้งค่าให้ gpiozero ใช้ LGPIO เป็น Backend (รองรับ Raspberry Pi 5 รหัสบอร์ด c04170)
try:
    Device.pin_factory = LGPIOFactory()
except Exception as e:
    print(f"Warning: Could not set LGPIOFactory: {e}")

# ดึงค่า Config จากโฟลเดอร์หลัก
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    import config
    DEFAULT_SORT_ANGLE = config.DEFAULT_SORT_ANGLE
    DEFAULT_RELEASE_ANGLE = config.DEFAULT_RELEASE_ANGLE
    
    SORT_ANGLE_PLASTIC = config.SORT_ANGLE_PLASTIC
    SORT_ANGLE_CAN = config.SORT_ANGLE_CAN
    SORT_ANGLE_CARTON = config.SORT_ANGLE_CARTON
    
    RELEASE_ANGLE_PLASTIC = config.RELEASE_ANGLE_PLASTIC
    RELEASE_ANGLE_CAN = config.RELEASE_ANGLE_CAN
    RELEASE_ANGLE_CARTON = config.RELEASE_ANGLE_CARTON
except ImportError:
    # Fallback กรณีรันเทสต์แยกไฟล์
    DEFAULT_SORT_ANGLE = 90
    DEFAULT_RELEASE_ANGLE = 90
    SORT_ANGLE_PLASTIC = 90
    SORT_ANGLE_CAN = 30
    SORT_ANGLE_CARTON = 150
    RELEASE_ANGLE_PLASTIC = 45
    RELEASE_ANGLE_CAN = 135
    RELEASE_ANGLE_CARTON = 135

SERVO_SORT_PIN = 18
SERVO_RELEASE_PIN = 19

# กำหนดว่าจะให้มอเตอร์มีแรงต้าน (Torque) ตลอดเวลาหรือไม่
# True = มอเตอร์เกร็งสู้แรงตลอดเวลา (แก้ปัญหาแผ่นรองขยะตกเวลารับน้ำหนัก)
# False = มอเตอร์ฟรีหลังจากหมุนเสร็จ
KEEP_TORQUE = False

# สร้าง Object ของ Servo โดยระบุช่วงคลื่น 500-2500 us สำหรับ 0-180 องศา
try:
    sort_servo = AngularServo(SERVO_SORT_PIN, min_angle=0, max_angle=180, min_pulse_width=0.0005, max_pulse_width=0.0025)
    release_servo = AngularServo(SERVO_RELEASE_PIN, min_angle=0, max_angle=180, min_pulse_width=0.0005, max_pulse_width=0.0025)
except Exception as e:
    print(f"Failed to initialize servos: {e}")
    sort_servo = None
    release_servo = None

def set_angle(pin, angle):
    target = sort_servo if pin == SERVO_SORT_PIN else release_servo
    if not target:
        return
        
    target.angle = angle
    time.sleep(1.0)  # ให้เวลา Servo หมุนไปถึงเป้าหมาย 1 วินาที
    
    if not KEEP_TORQUE:
        target.detach() # ตัดสัญญาณ PWM (เทียบเท่า pwm.ChangeDutyCycle(0))

def reset_position():
    set_angle(SERVO_SORT_PIN, DEFAULT_SORT_ANGLE)
    set_angle(SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE)

def sort_item(label):
    mapping = {
        "PLASTIC_BOTTLE": SORT_ANGLE_PLASTIC,
        "ALUMINUM_CAN": SORT_ANGLE_CAN,
        "BEVERAGE_CARTON": SORT_ANGLE_CARTON
    }
    angle = mapping.get(label, DEFAULT_SORT_ANGLE)
    set_angle(SERVO_SORT_PIN, angle)

def release_item(label="PLASTIC_BOTTLE"):
    mapping = {
        "PLASTIC_BOTTLE": RELEASE_ANGLE_PLASTIC,
        "ALUMINUM_CAN": RELEASE_ANGLE_CAN,
        "BEVERAGE_CARTON": RELEASE_ANGLE_CARTON
    }
    angle = mapping.get(label, 45)
    
    set_angle(SERVO_RELEASE_PIN, angle)   # หมุนลงเพื่อปล่อยขยะ
    time.sleep(1)
    set_angle(SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE) # คืนค่าตัวแผ่นรองกลับมาตำแหน่งเริ่มต้น
    set_angle(SERVO_SORT_PIN, DEFAULT_SORT_ANGLE)       # คืนค่าตัวปัดคัดแยกกลับมาตรงกลาง

def cleanup():
    if sort_servo:
        sort_servo.detach()
    if release_servo:
        release_servo.detach()