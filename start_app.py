import os
import subprocess
import time
import shutil

# --- Configuration ---
FRONTEND_DIR = "frontend"
BACKEND_DIR = "backend"

def print_step(msg):
    print(f"\n[>>>] {msg}")

def get_ips():
    try:
        wsl_ip = subprocess.run(['wsl','-d','Ubuntu','hostname','-I'], capture_output=True, text=True).stdout.split()[0]
        win_ip = "127.0.0.1"
        routes = subprocess.run(['wsl','-d','Ubuntu','--','ip','route'], capture_output=True, text=True).stdout.splitlines()
        for line in routes:
            if line.startswith('default via'):
                win_ip = line.split()[2]
                break
        return wsl_ip, win_ip
    except:
        return "127.0.0.1", "host-gateway"

def ensure_env_file(win_ip):
    env_content = ""
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            env_content = f.read()
    
    if "MACHINE_ID" not in env_content:
        with open(".env", "a") as f:
            f.write("\nMACHINE_ID=BIN-001\n")
    if "WINDOWS_IP" not in env_content:
        with open(".env", "a") as f:
            f.write(f"WINDOWS_IP={win_ip}\n")
            
    # Load .env into os.environ so backend can access SMTP variables
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()
        
    # Update or add WINDOWS_IP
    lines = env_content.splitlines()
    new_lines = [line for line in lines if not line.startswith("WINDOWS_IP=")]
    new_lines.append(f"WINDOWS_IP={win_ip}")
    
    with open(".env", "w") as f:
        f.write("\n".join(new_lines) + "\n")

def run_in_new_window(command, title):
    """Runs a command in a new PowerShell window (Windows Only)."""
    # ตัดส่วน WindowTitle ออกเพื่อป้องกัน Error ใน PowerShell
    full_cmd = f'start-process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "{command}"'
    subprocess.run(["powershell", "-Command", full_cmd])

def main():
    import sys
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
    print("==========================================")
    print("   SBAY SMART BIN - STARTUP SCRIPT")
    print("==========================================")

    wsl_ip, win_ip = get_ips()
    ensure_env_file(win_ip)

    # 1. ฐานข้อมูล (MongoDB ใน Docker WSL)
    print_step("กำลังเปิดฐานข้อมูล (MongoDB ใน Docker/WSL)...")
    try:
        result = subprocess.run(["wsl", "-d", "Ubuntu", "docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode != 0:
            print(">> กำลังเปิด Service Docker ใน Ubuntu...")
            subprocess.run(["wsl", "-d", "Ubuntu", "sudo", "service", "docker", "start"], check=False)
            # แก้เรื่องสิทธิ์การเข้าถึง Docker Socket
            subprocess.run(["wsl", "-d", "Ubuntu", "sudo", "chmod", "666", "/var/run/docker.sock"], check=False)
            time.sleep(2)
        
        # รัน MongoDB และ Nginx (Nginx จะเป็นตัวกลางรวม Frontend/Backend)
        subprocess.run(["wsl", "-d", "Ubuntu", "docker", "compose", "up", "-d", "mongodb", "nginx"], check=True)
        print(">> ฐานข้อมูลและระบบจัดการ Network (Nginx) พร้อมใช้งาน!")
    except Exception as e:
        print(f"[Warning] ไม่สามารถเปิดระบบใน WSL ได้ ({e})")

    time.sleep(2)

    # 2. เริ่ม Backend (Native Windows)
    print_step("กำลังเปิด Backend (Java Spring Boot)...")
    if not os.path.exists(os.path.join(BACKEND_DIR, "pom.xml")):
        print("[Error] ไม่พบโฟลเดอร์ Backend")
    else:
        java_home = r"C:\Users\Admin\AppData\Roaming\Antigravity\User\globalStorage\pleiades.java-extension-pack-jdk\java\17"
        os.environ["JAVA_HOME"] = java_home
        os.environ["PATH"] = java_home + r"\bin;" + os.environ.get("PATH", "")
        smtp_user = os.environ.get("SMTP_USERNAME", "")
        smtp_pass = os.environ.get("SMTP_PASSWORD", "")
        backend_cmd = f"$env:SMTP_USERNAME='{smtp_user}'; $env:SMTP_PASSWORD='{smtp_pass}'; cd {BACKEND_DIR}; mvn spring-boot:run"
        run_in_new_window(backend_cmd, "SBAY-Backend")

    # 3. เริ่ม Frontend (Native Windows)
    print_step("กำลังเปิด Frontend (Next.js)...")
    frontend_cmd = f"cd {FRONTEND_DIR}; npm run dev"
    run_in_new_window(frontend_cmd, "SBAY-Frontend")

    # 4. เริ่ม Cloudflare Tunnel
    token = ""
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                clean_line = line.strip()
                if clean_line.startswith("CF_TUNNEL_TOKEN="):
                    # แยกเอาแค่ส่วนหลังเครื่องหมาย = และตัดคอมเมนต์ (#) ออกถ้ามี
                    val = clean_line.split("=", 1)[1].split("#")[0].strip()
                    token = val
    
    if token and token != "your_token_here" and len(token) > 20:
        print_step("กำลังเปิด Cloudflare Tunnel (แบบถาวร)...")
        tunnel_cmd = f"cloudflared tunnel run --token {token}"
        run_in_new_window(tunnel_cmd, "SBAY-Cloudflare-Tunnel")
    else:
        print_step("กำลังเปิด Cloudflare Tunnel (แบบชั่วคราว - Quick Tunnel)...")
        tunnel_cmd = f"wsl -d Ubuntu docker run --rm --network sbay_default cloudflare/cloudflared:latest tunnel --url http://nginx:80"
        run_in_new_window(tunnel_cmd, "SBAY-Quick-Tunnel")
        print(">> กำลังสร้างลิงก์ชั่วคราว... กรุณาดู URL ในหน้าต่างใหม่ที่เด้งขึ้นมาครับ")

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
