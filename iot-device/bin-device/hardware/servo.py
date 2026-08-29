import time
import os
import sys

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
    
    DROP_ANGLE_CLOSED = config.DROP_ANGLE_CLOSED
    DROP_ANGLE_OPEN = config.DROP_ANGLE_OPEN
    RETURN_ANGLE_CLOSED = config.RETURN_ANGLE_CLOSED
    RETURN_ANGLE_OPEN = config.RETURN_ANGLE_OPEN
except ImportError:
    DEFAULT_SORT_ANGLE = 260
    DEFAULT_RELEASE_ANGLE = 82
    SORT_ANGLE_PLASTIC = 260
    SORT_ANGLE_CAN = 200
    SORT_ANGLE_CARTON = 320
    RELEASE_ANGLE_PLASTIC = 104
    RELEASE_ANGLE_CAN = 60
    RELEASE_ANGLE_CARTON = 60
    DROP_ANGLE_CLOSED = 90
    DROP_ANGLE_OPEN = 0
    RETURN_ANGLE_CLOSED = 90
    RETURN_ANGLE_OPEN = 0

SERVO_SORT_PIN = 18
SERVO_RELEASE_PIN = 19
SERVO_DROP_PIN = 12
SERVO_RETURN_PIN = 13
KEEP_TORQUE = False

# ========================================================
# การใช้ True Hardware PWM (rpi-hardware-pwm) สำหรับ Pi 5
# ต้องเปิด dtoverlay=pwm-2chan ใน /boot/firmware/config.txt
# Channel 2 = GPIO 18, Channel 3 = GPIO 19
# ========================================================
try:
    from rpi_hardware_pwm import HardwarePWM
    
    # 50 Hz สำหรับ Servo ทั่วไป (Sort/Release ใช้ Hardware PWM เพื่อความแม่นยำ 180 องศา)
    sort_servo = HardwarePWM(pwm_channel=2, hz=50)
    release_servo = HardwarePWM(pwm_channel=3, hz=50)
    
    sort_servo.start(0)
    release_servo.start(0)
    HARDWARE_PWM_ENABLED = True
except Exception as e:
    print("==========================================================")
    print(" ❌ ERROR: ไม่สามารถเรียกใช้ Hardware PWM ได้")
    print(f" ข้อผิดพลาด: {e}")
    print(" คุณต้องรันคำสั่ง 'sudo nano /boot/firmware/config.txt'")
    print(" แล้วเพิ่มบรรทัดนี้ไปท้ายไฟล์: dtoverlay=pwm-2chan")
    print(" จากนั้นสั่งรีบูตเครื่อง 1 รอบครับ (sudo reboot)")
    print("==========================================================")
    HARDWARE_PWM_ENABLED = False
    sys.exit(1)

# ========================================================
# ใช้ Software PWM (gpiozero) สำหรับมอเตอร์ 180 องศา (Drop/Return)
# เพื่อแก้ปัญหาขา 12/13 ไม่ยอมส่ง Hardware PWM
# ========================================================
from gpiozero import AngularServo
from gpiozero.pins.lgpio import LGPIOFactory
from gpiozero import Device
import warnings

# ปิด warning ของ gpiozero
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    try:
        # ใช้ lgpio เพื่อความเสถียรใน Pi 5
        Device.pin_factory = LGPIOFactory()
    except:
        pass

# มอเตอร์ 180 องศา (MG996R) มักจะใช้ pulse width 0.5ms ถึง 2.5ms (หรือใกล้เคียง)
try:
    drop_motor = AngularServo(SERVO_DROP_PIN, min_angle=0, max_angle=180, min_pulse_width=0.5/1000, max_pulse_width=2.5/1000)
    return_motor = AngularServo(SERVO_RETURN_PIN, min_angle=0, max_angle=180, min_pulse_width=0.5/1000, max_pulse_width=2.5/1000)
    SOFTWARE_PWM_ENABLED = True
except Exception as e:
    print(f"❌ ERROR: ไม่สามารถสร้าง Software PWM ได้: {e}")
    SOFTWARE_PWM_ENABLED = False


def set_angle(pin, angle):
    # กรณีเป็น Drop/Return (มอเตอร์ 180 องศาที่ใช้ gpiozero)
    if pin in [SERVO_DROP_PIN, SERVO_RETURN_PIN]:
        if not SOFTWARE_PWM_ENABLED:
            return
        
        target = drop_motor if pin == SERVO_DROP_PIN else return_motor
        target.angle = angle
        time.sleep(1.0)
        
        # ปิดสัญญาณ PWM เพื่อลดความร้อนมอเตอร์เมื่อไปถึงจุดที่ต้องการแล้ว
        if not KEEP_TORQUE:
            target.value = None
            
    # กรณีเป็น Sort/Release (มอเตอร์ 180 องศาที่ใช้ Hardware PWM)
    else:
        if not HARDWARE_PWM_ENABLED:
            return
            
        target = sort_servo if pin == SERVO_SORT_PIN else release_servo
        max_angle_scale = 360.0 if pin == SERVO_SORT_PIN else 180.0
        
        # คำนวณ Duty Cycle สำหรับ 50Hz (20ms period)
        duty_cycle = 2.5 + (angle / max_angle_scale) * 10.0
        
        target.change_duty_cycle(duty_cycle)
        time.sleep(1.0)
        
        # ตัดสัญญาณไฟเพื่อไม่ให้มอเตอร์ร้อน
        if not KEEP_TORQUE:
            target.change_duty_cycle(0)

def reset_position():
    set_angle(SERVO_SORT_PIN, DEFAULT_SORT_ANGLE)
    set_angle(SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE)
    set_angle(SERVO_DROP_PIN, DROP_ANGLE_CLOSED)
    set_angle(SERVO_RETURN_PIN, RETURN_ANGLE_CLOSED)

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
    
    set_angle(SERVO_RELEASE_PIN, angle)
    time.sleep(1)
    set_angle(SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE)
    set_angle(SERVO_SORT_PIN, DEFAULT_SORT_ANGLE)

def drop_item():
    """เปิดเพื่อให้ขวดหล่นลงมาในกล่อง จากนั้นปิดกลับ (สำหรับมอเตอร์ 180 องศา)"""
    set_angle(SERVO_DROP_PIN, DROP_ANGLE_OPEN)
    time.sleep(1.0)
    set_angle(SERVO_DROP_PIN, DROP_ANGLE_CLOSED)

def return_item():
    """เปิดเพื่อคืนขวดให้ผู้ใช้ จากนั้นปิดกลับ (สำหรับมอเตอร์ 180 องศา)"""
    set_angle(SERVO_RETURN_PIN, RETURN_ANGLE_OPEN)
    time.sleep(1.0)
    set_angle(SERVO_RETURN_PIN, RETURN_ANGLE_CLOSED)

def cleanup():
    if HARDWARE_PWM_ENABLED:
        sort_servo.stop()
        release_servo.stop()
    if SOFTWARE_PWM_ENABLED:
        drop_motor.close()
        return_motor.close()