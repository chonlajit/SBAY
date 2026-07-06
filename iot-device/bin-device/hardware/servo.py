import RPi.GPIO as GPIO
import time

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
    time.sleep(0.4)
    pwm.ChangeDutyCycle(0)

def reset_position():
    set_angle(sort_pwm, 90)
    set_angle(release_pwm, 0)

def sort_item(label):
    mapping = {
        "PLASTIC_BOTTLE": 90,    # ตรงกลาง/ช่องใหญ่สุด
        "ALUMINUM_CAN": 30,      # ขวาล่าง
        "BEVERAGE_CARTON": 150   # ซ้ายล่าง
    }
    angle = mapping.get(label, 90)
    set_angle(sort_pwm, angle)

def release_item():
    set_angle(release_pwm, 45)   # หมุนลง 45 องศาเพื่อปล่อยขยะ
    time.sleep(1)
    set_angle(release_pwm, 0)    # คืนค่ากลับมาตำแหน่งเดิม (แบนราบ)

def cleanup():
    sort_pwm.stop()
    release_pwm.stop()
    GPIO.cleanup()