import subprocess
import sys

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

    print("==================================================")
    print("   SBAY SMART BIN - RESET WASTE & POINTS DATA")
    print("==================================================")
    print("คำสั่งนี้จะทำการ:")
    print(" 1. ลบประวัติการทิ้งขยะทั้งหมด (device_sessions)")
    print(" 2. ลบประวัติการได้แต้มทั้งหมด (transactions)")
    print(" 3. ลบประวัติการแลกแต้ม/ของรางวัล (redemptions)")
    print(" 4. รีเซ็ตแต้มของผู้ใช้ทุกคนเป็น 0 (users.points = 0)")
    print(" 5. รีเซ็ตระดับขยะในถังอัจฉริยะเป็นค่าเริ่มต้น (devices)")
    print(" * หมายเหตุ: ข้อมูลบัญชีผู้ใช้, รหัสผ่าน, และสิทธิ์ Admin จะไม่หาย *\n")

    confirm = input("ยืนยันที่จะล้างข้อมูลหรือไม่? (y/N): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("ยกเลิกการทำงาน")
        sys.exit(0)

    mongo_script = (
        "db.device_sessions.deleteMany({});"
        "db.transactions.deleteMany({});"
        "db.redemptions.deleteMany({});"
        "db.users.updateMany({}, { $set: { points: 0 } });"
        "db.devices.updateMany({}, { $set: { wasteLevels: {}, fillLevel: 0, isFull: false, fullWasteType: null } });"
    )

    # 1. ลองรันผ่าน Docker โดยตรง
    print("\n[>>>] กำลังเชื่อมต่อกับ MongoDB ใน Docker...")
    success = False

    cmd_direct = ["docker", "exec", "-i", "sbay-mongodb", "mongosh", "iotdb", "--eval", mongo_script]
    try:
        res = subprocess.run(cmd_direct, capture_output=True, text=True)
        if res.returncode == 0:
            print(">> ล้างข้อมูลใน Docker สำเร็จเรียบร้อยแล้ว!")
            print(res.stdout)
            success = True
    except Exception:
        pass

    # 2. ถ้าไม่สำเร็จ ให้ลองผ่าน WSL Ubuntu
    if not success:
        print("[!] ไม่สามารถรัน Docker ตรงๆ ได้ กำลังลองผ่าน WSL (Ubuntu)...")
        cmd_wsl = ["wsl", "-d", "Ubuntu", "docker", "exec", "-i", "sbay-mongodb", "mongosh", "iotdb", "--eval", mongo_script]
        try:
            res = subprocess.run(cmd_wsl, capture_output=True, text=True)
            if res.returncode == 0:
                print(">> ล้างข้อมูลใน Docker (ผ่าน WSL) สำเร็จเรียบร้อยแล้ว!")
                print(res.stdout)
                success = True
            else:
                print(f"[Error] เกิดข้อผิดพลาด:\n{res.stderr}")
        except Exception as e:
            print(f"[Error] ไม่สามารถรันผ่าน WSL ได้: {e}")

    if success:
        print("="*50)
        print("ล้างข้อมูลขยะและแต้มทั้งระบบเสร็จสมบูรณ์!")
        print("คำแนะนำ: หากเปิดหน้าระบบอยู่ ให้รีเฟรชหรือรัน python restart_app.py")
        print("="*50)
    else:
        print("\n[!] ไม่สามารถล้างข้อมูลได้ กรุณาตรวจสอบว่า Docker และ Container sbay-mongodb กำลังทำงานอยู่หรือไม่")

if __name__ == "__main__":
    main()
