import subprocess
import os

def print_step(msg):
    print(f"\n[>>>] {msg}")

def main():
    import sys
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
    print("==========================================")
    print("   SBAY SMART BIN - SHUTDOWN SCRIPT")
    print("==========================================")

    # 1. หยุด Docker ใน WSL
    print_step("กำลังหยุด Docker Containers (MongoDB, Nginx)...")
    try:
        subprocess.run(["wsl", "-d", "Ubuntu", "docker", "compose", "down"], check=False)
        print(">> หยุด Docker สำเร็จ")
    except:
        print(">> ข้ามการหยุด Docker (อาจจะไม่ได้เปิดไว้)")

    # 2. ปิดโปรเซสบน Windows
    print_step("กำลังปิดหน้าต่าง Backend, Frontend และ Tunnel...")
    
    # คำสั่งปิด Java (Backend), Node (Frontend), และ Cloudflared (Tunnel)
    processes_to_kill = ["java.exe", "node.exe", "cloudflared.exe"]
    
    for proc in processes_to_kill:
        try:
            # ใช้ taskkill เพื่อปิดโปรเซสทั้งหมดที่มีชื่อตรงกัน
            subprocess.run(["taskkill", "/F", "/IM", proc, "/T"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f">> ปิด {proc} เรียบร้อย")
        except:
            pass

    print("\n" + "="*42)
    print("  ปิดระบบ SBAY ทั้งหมดเรียบร้อยแล้วครับ!")
    print("="*42)

if __name__ == "__main__":
    main()
