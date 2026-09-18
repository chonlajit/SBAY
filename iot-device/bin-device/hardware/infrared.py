try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(17, GPIO.IN)
    GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    GPIO_AVAILABLE = False

import time

IR_PIN = 17

def is_detected():
    if GPIO_AVAILABLE:
        return GPIO.input(IR_PIN) == 0  # Low = detected on most active-low IR modules
    return False

def wait_for_object():
    while not is_detected():
        time.sleep(0.05)