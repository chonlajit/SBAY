from rpi_hardware_pwm import HardwarePWM
import time

print("🧹 กำลังหยุดสัญญาณ Hardware PWM ทั้งหมด...")

try:
    for channel in [0, 1, 2, 3]:
        try:
            pwm = HardwarePWM(pwm_channel=channel, hz=50)
            pwm.stop()
        except Exception:
            pass
    print("✅ หยุดสัญญาณ PWM เรียบร้อยแล้ว Servo ควรจะหยุดหมุนครับ")
except Exception as e:
    print(f"เกิดข้อผิดพลาด: {e}")
