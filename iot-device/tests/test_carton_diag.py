#!/usr/bin/env python3
# ============================================================
# สคริปต์ทดสอบเฉพาะช่องกล่อง (BEVERAGE_CARTON) BCM 26 (TRIG), BCM 20 (ECHO)
# ============================================================
import os
import sys
import time

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(root_dir, 'bin-device'))
sys.path.insert(0, root_dir)

from settings.config import ULTRASONIC_PINS
from hardware.ultrasonic import UltrasonicSensor, GPIO_AVAILABLE

if not GPIO_AVAILABLE:
    print("❌ ไม่พบ RPi.GPIO กรุณารันบน Raspberry Pi")
    sys.exit(1)

carton_pins = ULTRASONIC_PINS.get("BEVERAGE_CARTON", {"trig": 26, "echo": 20})
trig = carton_pins["trig"]
echo = carton_pins["echo"]

print(f"📡 กำลังทดสอบช่องกล่อง: TRIG = BCM {trig} (Pin 37), ECHO = BCM {echo} (Pin 38)")
sensor = UltrasonicSensor(trig, echo, name="BEVERAGE_CARTON")

print("\nเริ่มอ่านค่า (กด Ctrl+C เพื่อหยุด)...")
print("-" * 50)

success_count = 0
fail_count = 0

try:
    for i in range(1, 31):
        # 1. ลองอ่านแบบ Single Ping ดิบๆ
        raw = sensor._single_measure(timeout_sec=0.04)
        
        # 2. อ่านแบบ Median Filter (3 samples)
        filtered = sensor.measure_distance_cm(samples=3)
        
        if filtered is not None:
            success_count += 1
            print(f"[{i:02d}] ✅ Raw: {str(raw):>6} cm | Filtered (Median): {filtered:>6.1f} cm")
        else:
            fail_count += 1
            print(f"[{i:02d}] ❌ Error/Timeout (Raw={raw})")
            
        time.sleep(0.3)
except KeyboardInterrupt:
    print("\nหยุดการทดสอบ")

total = success_count + fail_count
if total > 0:
    print("-" * 50)
    print(f"สรุปผล: สำเร็จ {success_count}/{total} ({success_count/total*100:.1f}%), ผิดพลาด {fail_count}/{total}")
