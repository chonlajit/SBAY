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

def sort_item(label):
    mapping = {
        "CLEAR_BOTTLE": 30,
        "OPAQUE_BOTTLE": 50,
        "GLASSES_BOTTLE": 90,
        "STEEL_CAN": 120,
        "ALUMINUM_CAN": 150
    }
    angle = mapping.get(label, 90)
    set_angle(sort_pwm, angle)

def release_item():
    set_angle(release_pwm, 90)
    time.sleep(1)
    set_angle(release_pwm, 0)

def cleanup():
    sort_pwm.stop()
    release_pwm.stop()
    GPIO.cleanup()