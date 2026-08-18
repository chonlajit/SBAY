import time
import os
import sys
import pigpio

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
# True = มอเตอร์เกร็งสู้แรงตลอดเวลา (แก้ปัญหาองศาเคลื่อนเวลามีขยะหล่นทับ แต่กินไฟและมอเตอร์อาจจะร้อนถ้าฝืด)
# False = มอเตอร์ฟรีหลังจากหมุนเสร็จ (เหมือนของเดิม)
KEEP_TORQUE = True

print("[Servo] Connecting to pigpio daemon...")
pi = pigpio.pi()
if not pi.connected:
    print("==========================================================")
    print(" ❌ ERROR: Cannot connect to pigpiod.")
    print(" คุณต้องเปิด Terminal ใหม่และรันคำสั่ง:")
    print("    sudo systemctl start pigpiod")
    print(" หรือพิมพ์ 'sudo pigpiod' ก่อนรันโปรแกรมนี้")
    print("==========================================================")
    sys.exit(1)

def set_angle(pin, angle):
    if not pi.connected:
        return
        
    # แปลงองศา 0-180 เป็น Pulse Width (ไมโครวินาที)
    # มาตรฐาน Servo ทั่วไปคือ 500 - 2500 us
    pulsewidth = int(500 + (angle / 180.0) * 2000)
    
    # สั่งหมุนไปตามองศาที่กำหนด
    pi.set_servo_pulsewidth(pin, pulsewidth)
    time.sleep(1.0)  # ให้เวลา Servo หมุนไปถึงเป้าหมาย 1 วินาที
    
    if not KEEP_TORQUE:
        # ตัดสัญญาณเพื่อไม่ให้มอเตอร์คราง แต่จะสูญเสียแรงต้าน
        pi.set_servo_pulsewidth(pin, 0)

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
    if pi.connected:
        pi.set_servo_pulsewidth(SERVO_SORT_PIN, 0)
        pi.set_servo_pulsewidth(SERVO_RELEASE_PIN, 0)
        pi.stop()