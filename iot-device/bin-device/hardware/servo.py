import RPi.GPIO as GPIO
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

GPIO.setmode(GPIO.BCM)

GPIO.setup(SERVO_SORT_PIN, GPIO.OUT)
GPIO.setup(SERVO_RELEASE_PIN, GPIO.OUT)

sort_pwm = GPIO.PWM(SERVO_SORT_PIN, 50)
release_pwm = GPIO.PWM(SERVO_RELEASE_PIN, 50)

sort_pwm.start(0)
release_pwm.start(0)

def set_angle(pwm, angle):
    duty = 2 + (angle / 18)
    pwm.ChangeDutyCycle(duty)
    time.sleep(1.0)  # เพิ่มเวลาเป็น 1 วินาที ให้เซอร์โวมีเวลาหมุนไปถึงจุดหมายก่อนตัดสัญญาณ
    pwm.ChangeDutyCycle(0)

def reset_position():
    set_angle(sort_pwm, DEFAULT_SORT_ANGLE)
    set_angle(release_pwm, DEFAULT_RELEASE_ANGLE)

def sort_item(label):
    mapping = {
        "PLASTIC_BOTTLE": SORT_ANGLE_PLASTIC,
        "ALUMINUM_CAN": SORT_ANGLE_CAN,
        "BEVERAGE_CARTON": SORT_ANGLE_CARTON
    }
    angle = mapping.get(label, DEFAULT_SORT_ANGLE)
    set_angle(sort_pwm, angle)

def release_item(label="PLASTIC_BOTTLE"):
    mapping = {
        "PLASTIC_BOTTLE": RELEASE_ANGLE_PLASTIC,
        "ALUMINUM_CAN": RELEASE_ANGLE_CAN,
        "BEVERAGE_CARTON": RELEASE_ANGLE_CARTON
    }
    angle = mapping.get(label, 45)
    
    set_angle(release_pwm, angle)   # หมุนลงเพื่อปล่อยขยะ
    time.sleep(1)
    set_angle(release_pwm, DEFAULT_RELEASE_ANGLE) # คืนค่าตัวแผ่นรองกลับมาตำแหน่งเริ่มต้น
    set_angle(sort_pwm, DEFAULT_SORT_ANGLE)       # คืนค่าตัวปัดคัดแยกกลับมาตรงกลาง

def cleanup():
    sort_pwm.stop()
    release_pwm.stop()
    GPIO.cleanup()