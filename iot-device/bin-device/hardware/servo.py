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
# ใช้ Software PWM (gpiozero) สำหรับมอเตอร์ 360 องศา (Drop/Return)
# เพื่อแก้ปัญหาขา 12/13 ไม่ยอมส่ง Hardware PWM
# ========================================================
from gpiozero import Servo
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

# กำหนด pulse width: 1.5ms = หยุด, 1.0ms = หมุนซ้าย, 2.0ms = หมุนขวา
try:
    drop_motor = Servo(SERVO_DROP_PIN, min_pulse_width=1.0/1000, max_pulse_width=2.0/1000)
    return_motor = Servo(SERVO_RETURN_PIN, min_pulse_width=1.0/1000, max_pulse_width=2.0/1000)
    SOFTWARE_PWM_ENABLED = True
except Exception as e:
    print(f"❌ ERROR: ไม่สามารถสร้าง Software PWM ได้: {e}")
    SOFTWARE_PWM_ENABLED = False


def set_angle(pin, angle):
    # กรณีเป็น Drop/Return (มอเตอร์ 360 องศา) ใช้ gpiozero
    if pin in [SERVO_DROP_PIN, SERVO_RETURN_PIN]:
        if not SOFTWARE_PWM_ENABLED:
            return
        
        target = drop_motor if pin == SERVO_DROP_PIN else return_motor
        
        # แปลงองศา 0-180 ให้เป็นค่า -1 ถึง 1 สำหรับ gpiozero.Servo
        # 90 องศา = 0 (หยุดนิ่ง)
        # 0 องศา = -1 (หมุนซ้าย)
        # 180 องศา = 1 (หมุนขวา)
        val = (angle - 90.0) / 90.0
        
        # จำกัดค่าไม่ให้เกิน -1.0 ถึง 1.0
        val = max(min(val, 1.0), -1.0)
        
        target.value = val
        time.sleep(1.0)
        
        # ห้ามปิดสัญญาณเด็ดขาดสำหรับ 360 องศา
        # ปล่อยให้มันคงค่า 90 องศา (value 0) แช่ไว้เพื่อไม่ให้หมุนเองจากคลื่นรบกวน
        
    # กรณีเป็น Sort/Release (มอเตอร์ 180 องศา) ใช้ Hardware PWM
    else:
        if not HARDWARE_PWM_ENABLED:
            return
            
        target = sort_servo if pin == SERVO_SORT_PIN else release_servo
        max_angle_scale = 360.0 if pin == SERVO_SORT_PIN else 180.0
        
        # คำนวณ Duty Cycle สำหรับ 50Hz (20ms period)
        duty_cycle = 2.5 + (angle / max_angle_scale) * 10.0
        
        target.change_duty_cycle(duty_cycle)
        time.sleep(1.0)
        
        # ตัดสัญญาณไฟเพื่อไม่ให้มอเตอร์ร้อน (สำหรับ 180 องศาเท่านั้น)
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
    """เปิดเพื่อให้ขวดหล่นลงมาในกล่อง (และหมุนปิดกลับถ้าตั้งค่าไว้)"""
    try:
        spin_time = getattr(config, "DROP_SPIN_TIME", 1.0)
        auto_reverse = getattr(config, "DROP_AUTO_REVERSE", True)
        reverse_angle = getattr(config, "DROP_ANGLE_REVERSE", 180)
    except NameError:
        spin_time = 1.0
        auto_reverse = True
        reverse_angle = 180
        
    set_angle(SERVO_DROP_PIN, DROP_ANGLE_OPEN)
    time.sleep(spin_time)
    
    if auto_reverse:
        set_angle(SERVO_DROP_PIN, reverse_angle)
        time.sleep(spin_time)
        
    set_angle(SERVO_DROP_PIN, DROP_ANGLE_CLOSED)

def return_item():
    """เปิดเพื่อคืนขวดให้ผู้ใช้ (และหมุนปิดกลับถ้าตั้งค่าไว้)"""
    try:
        spin_time = getattr(config, "RETURN_SPIN_TIME", 1.0)
        auto_reverse = getattr(config, "RETURN_AUTO_REVERSE", True)
        reverse_angle = getattr(config, "RETURN_ANGLE_REVERSE", 180)
    except NameError:
        spin_time = 1.0
        auto_reverse = True
        reverse_angle = 180
        
    set_angle(SERVO_RETURN_PIN, RETURN_ANGLE_OPEN)
    time.sleep(spin_time)
    
    if auto_reverse:
        set_angle(SERVO_RETURN_PIN, reverse_angle)
        time.sleep(spin_time)
        
    set_angle(SERVO_RETURN_PIN, RETURN_ANGLE_CLOSED)

def cleanup():
    if HARDWARE_PWM_ENABLED:
        sort_servo.stop()
        release_servo.stop()
    if SOFTWARE_PWM_ENABLED:
        drop_motor.close()
        return_motor.close()