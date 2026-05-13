import os
import subprocess
import time
import shutil

# --- Configuration ---
FRONTEND_DIR = "frontend"
BACKEND_DIR = "backend"

def print_step(msg):
    print(f"\n[>>>] {msg}")

def ensure_env_file():
    if not os.path.exists(".env"):
        print_step("Creating .env file from .env.example...")
        if os.path.exists(".env.example"):
            shutil.copy(".env.example", ".env")
        else:
            with open(".env", "w") as f:
                f.write("MACHINE_ID=BIN-001\nCF_TUNNEL_TOKEN=\n")

def run_in_new_window(command, title):
    full_cmd = f'start-process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "$Host.UI.RawUI.WindowTitle=\'{title}\'; {command}"'
    subprocess.run(["powershell", "-Command", full_cmd])

def main():
    print("==========================================")
    print("   SBAY SMART BIN - STARTUP SCRIPT")
    print("==========================================")

    ensure_env_file()

    # 1. ฐานข้อมูล (MongoDB ใน Docker WSL)
    print_step("กำลังเปิดฐานข้อมูล (MongoDB ใน Docker/WSL)...")
    try:
        result = subprocess.run(["wsl", "-d", "Ubuntu", "docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode != 0:
            print(">> กำลังเปิด Service Docker ใน Ubuntu...")
            subprocess.run(["wsl", "-d", "Ubuntu", "sudo", "service", "docker", "start"], check=False)
            time.sleep(2)
        
        subprocess.run(["wsl", "-d", "Ubuntu", "docker", "compose", "up", "-d", "mongodb"], check=True)
        print(">> ฐานข้อมูลพร้อมใช้งาน!")
    except Exception as e:
        print(f"[Warning] ข้ามการเปิด MongoDB ใน WSL (ถ้าใช้ Atlas ให้ข้ามข้อความนี้ไป)")

    time.sleep(2)

    # 2. เริ่ม Backend (Native Windows)
    print_step("กำลังเปิด Backend (Java Spring Boot)...")
    if not os.path.exists(os.path.join(BACKEND_DIR, "pom.xml")):
        print("[Error] ไม่พบโฟลเดอร์ Backend")
    else:
        backend_cmd = f"cd {BACKEND_DIR}; mvn spring-boot:run"
        run_in_new_window(backend_cmd, "SBAY-Backend")

    # 3. เริ่ม Frontend (Native Windows)
    print_step("กำลังเปิด Frontend (Next.js)...")
    frontend_cmd = f"cd {FRONTEND_DIR}; npm run dev"
    run_in_new_window(frontend_cmd, "SBAY-Frontend")

    # 4. เริ่ม Cloudflare Tunnel (ถ้ามี Token)
    token = ""
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("CF_TUNNEL_TOKEN="):
                    token = line.split("=")[1].strip()
    
    if token and token != "your_token_here":
        print_step("กำลังเปิด Cloudflare Tunnel...")
        tunnel_cmd = f"cloudflared tunnel run --token {token}"
        run_in_new_window(tunnel_cmd, "SBAY-Cloudflare-Tunnel")
    else:
        print("\n[Info] ไม่พบ CF_TUNNEL_TOKEN ใน .env (ข้ามการเปิด Tunnel)")

    print("\n" + "="*42)
    print("  ระบบกำลังทำงานแบบ NATIVE บน WINDOWS!")
    print("  - Frontend: http://localhost:3000")
    print("  - Backend API: http://localhost:8070")
    print("="*42)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nShutdown requested.")
