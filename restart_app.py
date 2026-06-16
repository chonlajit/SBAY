import subprocess
import sys
import time
import os

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
    print("==========================================")
    print("   SBAY SMART BIN - RESTART SCRIPT")
    print("==========================================")
    
    # ดึง path ปัจจุบันที่สคริปต์นี้อยู่
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("\n[>>>] 1. กำลังรัน stop_app.py เพื่อปิดระบบทั้งหมด...")
    try:
        subprocess.run([sys.executable, "stop_app.py"], cwd=current_dir, check=True)
    except subprocess.CalledProcessError:
        print("[!] stop_app.py ทำงานไม่สำเร็จ อาจจะไม่มีระบบใดเปิดอยู่ จะพยายามเริ่มระบบต่อ...")
    
    print("\n[>>>] รอระบบคืนพอร์ตสักครู่ (3 วินาที)...")
    time.sleep(3)
    
    print("\n[>>>] 2. กำลังรัน start_app.py เพื่อเปิดระบบใหม่...")
    try:
        subprocess.run([sys.executable, "start_app.py"], cwd=current_dir, check=True)
    except subprocess.CalledProcessError:
        print("[!] เกิดข้อผิดพลาดขณะรัน start_app.py กรุณาตรวจสอบ log")
        sys.exit(1)

if __name__ == "__main__":
    main()
