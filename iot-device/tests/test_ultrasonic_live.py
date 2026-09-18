#!/usr/bin/env python3
# ==========================================
# SBAY Smart Bin - Ultrasonic Live Test & Calibration Tool
# สำหรับทดสอบและ Calibrate เซนเซอร์อัลตราโซนิกวัดระดับความเต็ม 3 ช่อง
# ==========================================

import os
import sys
import time

# เพิ่ม Root path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(root_dir, 'bin-device'))
sys.path.insert(0, root_dir)

# รองรับภาษาไทยและ Emoji บนทุก Terminal
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from settings.config import (
    USE_HARDWARE,
    ULTRASONIC_PINS,
    ULTRASONIC_CALIBRATION,
    FILL_THRESHOLD_WARNING,
    FILL_THRESHOLD_FULL,
    ULTRASONIC_SENSOR_DELAY_MS
)

# ข้อมูลขา Pin Map (BCM vs Physical Board Pins)
PIN_MAP = {
    "PLASTIC_BOTTLE": {
        "th_name": "ขวดพลาสติก (Plastic Bottle)",
        "trig_bcm": 22, "trig_phys": 15,
        "echo_bcm": 23, "echo_phys": 16,
    },
    "ALUMINUM_CAN": {
        "th_name": "กระป๋องอลูมิเนียม (Aluminum Can)",
        "trig_bcm": 24, "trig_phys": 18,
        "echo_bcm": 25, "echo_phys": 22,
    },
    "BEVERAGE_CARTON": {
        "th_name": "กล่องเครื่องดื่ม (Beverage Carton)",
        "trig_bcm": 26, "trig_phys": 37,
        "echo_bcm": 20, "echo_phys": 38,
    }
}

def print_pinout_table():
    print("\n" + "=" * 68)
    print(" 📡 SBAY ULTRASONIC SENSOR HARDWARE PINOUT")
    print("=" * 68)
    print(f"{'ช่องขยะ':<24} | {'TRIG (BCM/Phys)':<18} | {'ECHO (BCM/Phys)':<18}")
    print("-" * 68)
    for comp, info in PIN_MAP.items():
        trig_str = f"BCM {info['trig_bcm']:>2} (Pin {info['trig_phys']:>2})"
        echo_str = f"BCM {info['echo_bcm']:>2} (Pin {info['echo_phys']:>2})"
        print(f"{info['th_name']:<24} | {trig_str:<18} | {echo_str:<18}")
    print("-" * 68)
    print(" ⚡ VCC: 5V (Physical Pin 2 หรือ Pin 4 หรือ External 5V DC)")
    print(" ⚡ GND: Ground (Physical Pin 6, 9, 14, 20, 25, 30, 34, 39)")
    print(" ⚠️  ข้อควรระวัง: ขา ECHO ต้องต่อผ่านตัวแบ่งแรงดัน (Voltage Divider 1k/2k)")
    print("    เพื่อลดแรงดันจาก 5V เหลือ ~3.3V เข้า Raspberry Pi ป้องกันพอร์ตเสียหาย")
    print("=" * 68 + "\n")

def get_sensors():
    from hardware.ultrasonic import UltrasonicSensor, MockUltrasonicSensor
    sensors = {}
    for comp in ["PLASTIC_BOTTLE", "ALUMINUM_CAN", "BEVERAGE_CARTON"]:
        pins = ULTRASONIC_PINS.get(comp, {})
        trig = pins.get("trig")
        echo = pins.get("echo")
        if USE_HARDWARE:
            try:
                sensors[comp] = UltrasonicSensor(trig, echo, name=comp)
            except Exception as e:
                print(f"⚠️  ไม่สามารถเปิด Hardware Sensor {comp}: {e}")
                sensors[comp] = MockUltrasonicSensor(trig, echo, name=comp)
        else:
            sensors[comp] = MockUltrasonicSensor(trig, echo, name=comp)
    return sensors

def calculate_fill(comp: str, distance_cm: float) -> tuple[float, str]:
    cal = ULTRASONIC_CALIBRATION.get(comp, {"empty_distance": 50.0, "full_distance": 10.0})
    empty_d = cal["empty_distance"]
    full_d = cal["full_distance"]

    if distance_cm is None:
        return 0.0, "TIMEOUT/ERROR"

    if empty_d <= full_d:
        fill_pct = 0.0
    else:
        fill_pct = ((empty_d - distance_cm) / (empty_d - full_d)) * 100.0
        fill_pct = max(0.0, min(100.0, round(fill_pct, 1)))

    if fill_pct >= FILL_THRESHOLD_FULL:
        status = "🔴 FULL (เต็ม)"
    elif fill_pct >= FILL_THRESHOLD_WARNING:
        status = "🟡 WARNING (ใกล้เต็ม)"
    else:
        status = "🟢 NORMAL (ว่าง)"

    return fill_pct, status

def test_single_sensor(comp: str, sensors: dict):
    sensor = sensors.get(comp)
    info = PIN_MAP.get(comp, {})
    print(f"\n--- ทดสอบช่อง: {info.get('th_name', comp)} ---")
    print(f"Trig: BCM {info.get('trig_bcm')} (Pin {info.get('trig_phys')}), Echo: BCM {info.get('echo_bcm')} (Pin {info.get('echo_phys')})")
    print("กำลังวัด 5 ครั้งต่อเนื่อง (กด Ctrl+C เพื่อหยุด)...\n")

    for i in range(1, 6):
        dist = sensor.measure_distance_cm()
        if dist is not None:
            pct, status = calculate_fill(comp, dist)
            print(f"  ครั้งที่ {i}: ระยะ = {dist:>6.1f} cm | ความเต็ม = {pct:>5.1f}% | สถานะ: {status}")
        else:
            print(f"  ครั้งที่ {i}: ❌ ไม่สามารถอ่านค่าได้ (Echo Timeout/Sensor หลวม)")
        time.sleep(0.5)

def live_monitor_all(sensors: dict):
    print("\n" + "=" * 70)
    print(" 📊 REAL-TIME CONTINUOUS MONITOR (อ่านวน 3 ช่องทีละตัว หน่วง 60ms)")
    print(" กด Ctrl+C เพื่อกลับสู่เมนูหลัก")
    print("=" * 70)

    delay_sec = ULTRASONIC_SENSOR_DELAY_MS / 1000.0
    comps = ["PLASTIC_BOTTLE", "ALUMINUM_CAN", "BEVERAGE_CARTON"]

    try:
        round_count = 1
        while True:
            readings = []
            for comp in comps:
                sensor = sensors[comp]
                dist = sensor.measure_distance_cm()
                if dist is not None:
                    pct, status = calculate_fill(comp, dist)
                    readings.append(f"{dist:>5.1f}cm ({pct:>5.1f}%) {status.split()[0]}")
                else:
                    readings.append("  ERR (---%) ❌")
                # Inter-sensor delay ป้องกันคลื่นเสียงกวนกัน
                time.sleep(delay_sec)

            p_str, c_str, b_str = readings
            print(f"[{round_count:>4}] ขวด: {p_str} | กระป๋อง: {c_str} | กล่อง: {b_str}")
            round_count += 1
            time.sleep(1.0)
    except KeyboardInterrupt:
        print("\nหยุด Live Monitor")

def run_calibration_helper(sensors: dict):
    print("\n" + "=" * 60)
    print(" 🛠️  SBAY ULTRASONIC CALIBRATION HELPER")
    print("=" * 60)
    print("เครื่องมือช่วยตั้งค่าระยะ Empty Distance และ Full Distance")
    print("เลือกช่องที่ต้องการ Calibrate:")
    print("1. ขวดพลาสติก (PLASTIC_BOTTLE)")
    print("2. กระป๋อง (ALUMINUM_CAN)")
    print("3. กล่องเครื่องดื่ม (BEVERAGE_CARTON)")

    ch = input("👉 ใส่เลขช่อง (1-3): ").strip()
    c_map = {"1": "PLASTIC_BOTTLE", "2": "ALUMINUM_CAN", "3": "BEVERAGE_CARTON"}
    comp = c_map.get(ch)
    if not comp:
        print("❌ ตัวเลือกไม่ถูกต้อง")
        return

    sensor = sensors[comp]
    th_name = PIN_MAP[comp]["th_name"]

    print(f"\n--- Calibrate: {th_name} ---")
    input("👉 ขั้นตอนที่ 1: เคลียร์ขยะออกจากถังให้โล่ง (ถังว่างเปล่า) แล้วกด [Enter] เพื่อวัดค่า...")
    empty_samples = []
    for _ in range(5):
        d = sensor.measure_distance_cm()
        if d: empty_samples.append(d)
        time.sleep(0.1)
    if not empty_samples:
        print("❌ อ่านค่าเซนเซอร์ไม่ได้ กรุณาตรวจเช็คสายต่อ")
        return
    avg_empty = round(sum(empty_samples) / len(empty_samples), 1)
    print(f"✅ ระยะถังเปล่าที่วัดได้ (empty_distance) = {avg_empty} cm\n")

    input("👉 ขั้นตอนที่ 2: นำแผ่นกระดาษหรือจำลองขยะเต็มถังมาวางหน้าเซ็นเซอร์ แล้วกด [Enter] เพื่อวัดค่า...")
    full_samples = []
    for _ in range(5):
        d = sensor.measure_distance_cm()
        if d: full_samples.append(d)
        time.sleep(0.1)
    if not full_samples:
        print("❌ อ่านค่าเซนเซอร์ไม่ได้ กรุณาตรวจเช็คสายต่อ")
        return
    avg_full = round(sum(full_samples) / len(full_samples), 1)
    print(f"✅ ระยะถังเต็มที่วัดได้ (full_distance) = {avg_full} cm\n")

    print("=" * 60)
    print("🎉 ค่า Calibration ที่แนะนำให้นำไปใส่ใน config.py หรือ .env:")
    print(f'"{comp}": {{"empty_distance": {avg_empty}, "full_distance": {avg_full}}}')
    print("=" * 60)

def main():
    print_pinout_table()
    sensors = get_sensors()

    try:
        while True:
            print("\n" + "-" * 40)
            print("🕹️  เมนูทดสอบ Ultrasonic:")
            print("1. ทดสอบช่องขวดพลาสติก (Plastic)")
            print("2. ทดสอบช่องกระป๋อง (Can)")
            print("3. ทดสอบช่องกล่องเครื่องดื่ม (Carton)")
            print("4. Live Monitor ตรวจวัดทั้ง 3 ช่องแบบต่อเนื่อง")
            print("5. Calibration Helper (ช่วยวัดระยะถังเปล่า/ถังเต็ม)")
            print("p. พิมพ์ตาราง Pinout อีกครั้ง")
            print("q. ออกจากโปรแกรม")
            print("-" * 40)

            choice = input("👉 กรุณาเลือกเมนู (1/2/3/4/5/p/q): ").strip().lower()

            if choice == 'q':
                break
            elif choice == '1':
                test_single_sensor("PLASTIC_BOTTLE", sensors)
            elif choice == '2':
                test_single_sensor("ALUMINUM_CAN", sensors)
            elif choice == '3':
                test_single_sensor("BEVERAGE_CARTON", sensors)
            elif choice == '4':
                live_monitor_all(sensors)
            elif choice == '5':
                run_calibration_helper(sensors)
            elif choice == 'p':
                print_pinout_table()
            else:
                print("❌ ตัวเลือกไม่ถูกต้อง")

    except KeyboardInterrupt:
        print("\n🛑 หยุดโปรแกรม")
    finally:
        for s in sensors.values():
            s.cleanup()
        print("🧹 ทำความสะอาด GPIO เรียบร้อย")

if __name__ == "__main__":
    main()
