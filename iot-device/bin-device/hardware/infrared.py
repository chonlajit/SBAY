import RPi.GPIO as GPIO
import time

IR_PIN = 17

GPIO.setmode(GPIO.BCM)
GPIO.setup(IR_PIN, GPIO.IN)

def is_detected():
    return GPIO.input(IR_PIN) == 0  # บางรุ่นอาจต้อง == 1

def wait_for_object():
    while not is_detected():
        time.sleep(0.05)