import time
import os
import sys

# ดึงค่า Config จากโฟลเดอร์หลัก
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
try:
    import settings.config as config
    DEFAULT_SORT_ANGLE = config.DEFAULT_SORT_ANGLE
    DEFAULT_RELEASE_ANGLE = config.DEFAULT_RELEASE_ANGLE
    
    SORT_ANGLE_PLASTIC = config.SORT_ANGLE_PLASTIC
    SORT_ANGLE_CAN = config.SORT_ANGLE_CAN
    SORT_ANGLE_CARTON = config.SORT_ANGLE_CARTON
    SORT_ANGLE_RETURN = getattr(config, 'SORT_ANGLE_RETURN', 140)
    
    RELEASE_ANGLE_PLASTIC = config.RELEASE_ANGLE_PLASTIC
    RELEASE_ANGLE_CAN = config.RELEASE_ANGLE_CAN
    RELEASE_ANGLE_CARTON = config.RELEASE_ANGLE_CARTON
    RELEASE_ANGLE_RETURN = getattr(config, 'RELEASE_ANGLE_RETURN', 60)
    
    DROP_ANGLE_CLOSED = config.DROP_ANGLE_CLOSED
    DROP_ANGLE_OPEN = config.DROP_ANGLE_OPEN
    RETURN_ANGLE_CLOSED = config.RETURN_ANGLE_CLOSED
    RETURN_ANGLE_OPEN = config.RETURN_ANGLE_OPEN
except ImportError:
    DEFAULT_SORT_ANGLE = 265
    DEFAULT_RELEASE_ANGLE = 82
    SORT_ANGLE_PLASTIC = 265
    SORT_ANGLE_CAN = 200
    SORT_ANGLE_CARTON = 320
    SORT_ANGLE_RETURN = 135
    RELEASE_ANGLE_PLASTIC = 145
    RELEASE_ANGLE_CAN = 55
    RELEASE_ANGLE_CARTON = 55
    RELEASE_ANGLE_RETURN = 55
    DROP_ANGLE_CLOSED = 90
    DROP_ANGLE_OPEN = 180
    RETURN_ANGLE_CLOSED = 90
    RETURN_ANGLE_OPEN = 180

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

# มอเตอร์ 180 องศา (MG996R)
# กำหนด initial_angle=None เพื่อไม่ให้มอเตอร์ดีด/สะบัดไปที่ 0 องศาโดยไม่ตั้งใจตอน import โมดูล
# และใช้ช่วง pulse 0.6ms - 2.4ms เพื่อความปลอดภัย ไม่ชนขอบ Mechanical stop ด้านใน
try:
    drop_motor = AngularServo(
        SERVO_DROP_PIN,
        min_angle=0,
        max_angle=180,
        initial_angle=None,
        min_pulse_width=0.6/1000,
        max_pulse_width=2.4/1000
    )
    return_motor = AngularServo(
        SERVO_RETURN_PIN,
        min_angle=0,
        max_angle=180,
        initial_angle=None,
        min_pulse_width=0.6/1000,
        max_pulse_width=2.4/1000
    )
    SOFTWARE_PWM_ENABLED = True
except Exception as e:
    print(f"❌ ERROR: ไม่สามารถสร้าง Software PWM ได้: {e}")
    SOFTWARE_PWM_ENABLED = False


def set_angle(pin, angle, smooth=False):
    # กรณีเป็น Drop/Return (มอเตอร์ 180 องศาที่ใช้ gpiozero)
    if pin in [SERVO_DROP_PIN, SERVO_RETURN_PIN]:
        if not SOFTWARE_PWM_ENABLED:
            return
        
        target = drop_motor if pin == SERVO_DROP_PIN else return_motor
        angle = max(0, min(180, float(angle)))

        # ถ้าระบุ smooth และ target มีตำแหน่งเดิมอยู่แล้ว ให้ค่อยๆ หมุนเป็นจังหวะ ไม่กระชาก
        if smooth and target.angle is not None:
            curr = target.angle
            step = 3 if angle > curr else -3
            for a in range(int(curr), int(angle), step):
                target.angle = a
                time.sleep(0.015)

        target.angle = angle
        time.sleep(0.8)
        
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

def hold_torque(pin=SERVO_RELEASE_PIN, angle=None):
    """
    ส่งสัญญาณ PWM ค้างไว้ เพื่อล็อกตำแหน่งแกนมอเตอร์ให้ 'เกร็งสู้' แรงกระแทกของขวดที่ตกลงมา
    """
    if pin in [SERVO_DROP_PIN, SERVO_RETURN_PIN]:
        if not SOFTWARE_PWM_ENABLED:
            return
        target = drop_motor if pin == SERVO_DROP_PIN else return_motor
        ang = angle if angle is not None else (DROP_ANGLE_CLOSED if pin == SERVO_DROP_PIN else RETURN_ANGLE_CLOSED)
        if target:
            target.angle = max(0, min(180, float(ang)))
    else:
        if not HARDWARE_PWM_ENABLED:
            return
        target = sort_servo if pin == SERVO_SORT_PIN else release_servo
        max_scale = 360.0 if pin == SERVO_SORT_PIN else 180.0
        ang = angle if angle is not None else (DEFAULT_SORT_ANGLE if pin == SERVO_SORT_PIN else DEFAULT_RELEASE_ANGLE)
        duty_cycle = 2.5 + (ang / max_scale) * 10.0
        target.change_duty_cycle(duty_cycle)

def release_torque(pin=None):
    """
    ตัดสัญญาณไฟเพื่อพักมอเตอร์ ไม่ให้ร้อน
    """
    if pin is None:
        if HARDWARE_PWM_ENABLED:
            sort_servo.change_duty_cycle(0)
            release_servo.change_duty_cycle(0)
        if SOFTWARE_PWM_ENABLED:
            if drop_motor: drop_motor.value = None
            if return_motor: return_motor.value = None
    elif pin == SERVO_SORT_PIN and HARDWARE_PWM_ENABLED:
        sort_servo.change_duty_cycle(0)
    elif pin == SERVO_RELEASE_PIN and HARDWARE_PWM_ENABLED:
        release_servo.change_duty_cycle(0)
    elif pin == SERVO_DROP_PIN and SOFTWARE_PWM_ENABLED and drop_motor:
        drop_motor.value = None
    elif pin == SERVO_RETURN_PIN and SOFTWARE_PWM_ENABLED and return_motor:
        return_motor.value = None

def reset_position(reset_180=None):
    """
    รีเซ็ตตำแหน่ง Servo:
    - Sort Servo -> DEFAULT_SORT_ANGLE
    - Release Servo -> DEFAULT_RELEASE_ANGLE
    - Drop / Return (Servo 180) -> ควบคุมผ่าน RESET_180_SERVOS_ON_STARTUP ใน config.py (ค่าเริ่มต้น False)
    """
    set_angle(SERVO_SORT_PIN, DEFAULT_SORT_ANGLE)
    set_angle(SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE)

    if reset_180 is None:
        reset_180 = getattr(config, 'RESET_180_SERVOS_ON_STARTUP', False)

    if reset_180:
        set_angle(SERVO_DROP_PIN, DROP_ANGLE_CLOSED, smooth=True)
        set_angle(SERVO_RETURN_PIN, RETURN_ANGLE_CLOSED, smooth=True)

def sort_item(label):
    mapping = {
        "PLASTIC_BOTTLE": SORT_ANGLE_PLASTIC,
        "CLEAR_BOTTLE": SORT_ANGLE_PLASTIC,
        "BOTTLE": SORT_ANGLE_PLASTIC,
        "ALUMINUM_CAN": SORT_ANGLE_CAN,
        "CAN": SORT_ANGLE_CAN,
        "CANNED": SORT_ANGLE_CAN,
        "BEVERAGE_CARTON": SORT_ANGLE_CARTON,
        "CARTON": SORT_ANGLE_CARTON,
        "MILK": SORT_ANGLE_CARTON,
        "RETURN": SORT_ANGLE_RETURN
    }
    angle = mapping.get(str(label).upper(), DEFAULT_SORT_ANGLE)
    set_angle(SERVO_SORT_PIN, angle)

def release_item(label="PLASTIC_BOTTLE"):
    mapping = {
        "PLASTIC_BOTTLE": RELEASE_ANGLE_PLASTIC,
        "CLEAR_BOTTLE": RELEASE_ANGLE_PLASTIC,
        "BOTTLE": RELEASE_ANGLE_PLASTIC,
        "ALUMINUM_CAN": RELEASE_ANGLE_CAN,
        "CAN": RELEASE_ANGLE_CAN,
        "CANNED": RELEASE_ANGLE_CAN,
        "BEVERAGE_CARTON": RELEASE_ANGLE_CARTON,
        "CARTON": RELEASE_ANGLE_CARTON,
        "MILK": RELEASE_ANGLE_CARTON,
        "RETURN": RELEASE_ANGLE_RETURN
    }
    angle = mapping.get(str(label).upper(), 45)
    
    set_angle(SERVO_RELEASE_PIN, angle)
    time.sleep(1)
    set_angle(SERVO_RELEASE_PIN, DEFAULT_RELEASE_ANGLE)
    set_angle(SERVO_SORT_PIN, DEFAULT_SORT_ANGLE)

def drop_item():
    """เปิดเพื่อให้ขวดหล่นลงมาในกล่อง จากนั้นปิดกลับ (สำหรับมอเตอร์ 180 องศา)"""
    set_angle(SERVO_DROP_PIN, DROP_ANGLE_OPEN, smooth=True)
    time.sleep(1.0)
    set_angle(SERVO_DROP_PIN, DROP_ANGLE_CLOSED, smooth=True)

def open_return_door():
    """เปิดประตูช่องคืนขวด (หมุน Return Servo ไปตำแหน่งเปิด และเกร็งค้างไว้)"""
    hold_torque(SERVO_RETURN_PIN, RETURN_ANGLE_OPEN)

def close_return_door():
    """ปิดประตูช่องคืนขวด (หมุน Return Servo กลับตำแหน่งปิด และตัดไฟพักมอเตอร์)"""
    set_angle(SERVO_RETURN_PIN, RETURN_ANGLE_CLOSED, smooth=True)

def return_item():
    """เปิดเพื่อคืนขวดให้ผู้ใช้ จากนั้นปิดกลับ (สำหรับมอเตอร์ 180 องศา)"""
    open_return_door()
    time.sleep(1.0)
    close_return_door()

def return_bottle():
    """
    Flow การคืนขวด (Return Bottle Flow):
    1. Return servo หมุนเปิดประตูก่อน (Open Return Door)
    2. ค่อยหมุน Sort servo ไปทิศคืนขวด (Sort to RETURN)
    3. ปล่อยแผ่นรองขวด (Release Servo -> RETURN)
    4. หมุนกลับมาทิศ default ก่อน (release_item จะหมุน Release และ Sort กลับมา Default ให้อัตโนมัติ)
    5. แล้วค่อยปิดประตู return (Close Return Door)
    """
    # 1. หมุน Return Servo เพื่อเปิดประตูก่อน
    open_return_door()
    time.sleep(1.0)

    # 2. ค่อยหมุนไปทิศคืนขวด
    sort_item("RETURN")
    time.sleep(0.5)

    # 3. ปล่อยแผ่นรองขวด และ 4. หมุนกลับมาทิศ default
    release_item("RETURN")
    time.sleep(0.5)

    # 5. แล้วค่อยปิดประตู return
    close_return_door()

def cleanup():
    if HARDWARE_PWM_ENABLED:
        sort_servo.stop()
        release_servo.stop()
    if SOFTWARE_PWM_ENABLED:
        drop_motor.close()
        return_motor.close()
