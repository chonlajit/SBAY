import os
import subprocess
import time
import sys
import shutil

# --- Configuration ---
WSL_DISTRO = "Ubuntu"
BACKEND_SERVICES = ["backend", "mongodb"]
FRONTEND_DIR = "frontend"
#--------------------

def print_step(msg):
    print(f"\n[>>>] {msg}")

def check_command(cmd):
    """Check if a command exists on the system."""
    return shutil.which(cmd) is not None

def ensure_env_file():
    """Ensure .env file exists."""
    if not os.path.exists(".env"):
        print_step("Creating .env file from .env.example...")
        if os.path.exists(".env.example"):
            shutil.copy(".env.example", ".env")
        else:
            with open(".env", "w") as f:
                f.write("MACHINE_ID=BIN-001\nCF_TUNNEL_TOKEN=your_token_here\n")

def check_docker_wsl():
    """Check if Docker service is running in WSL."""
    try:
        result = subprocess.run(["wsl", "-d", WSL_DISTRO, "docker", "info"], 
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return result.returncode == 0
    except:
        return False

def start_docker_service():
    """Attempt to start Docker service in WSL."""
    print_step("Starting Docker service in Ubuntu...")
    try:
        subprocess.run(["wsl", "-d", WSL_DISTRO, "sudo", "service", "docker", "start"], check=True)
        return True
    except:
        print("[Error] Failed to start Docker. Please make sure Ubuntu is set up correctly.")
        return False

def run_in_new_window(command, title):
    """Runs a command in a new PowerShell window."""
    # Added -ExecutionPolicy Bypass to avoid the npm.ps1 error
    full_cmd = f'start-process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "{command}"'
    subprocess.run(["powershell", "-Command", full_cmd])

def main():
    print("==========================================")
    print("   SBAY SMART BIN - SYSTEM LAUNCHER")
    print("==========================================")

    # 1. Environment Setup
    ensure_env_file()

    # 2. Check Docker in WSL
    if not check_docker_wsl():
        if not start_docker_service():
            print("Please run 'sudo service docker start' inside Ubuntu first.")
            sys.exit(1)
        # Wait a bit for daemon to wake up
        time.sleep(2)

    # 3. Start Backend & DB via Docker Compose
    print_step("Spinning up Containers (Backend & DB)...")
    try:
        compose_cmd = ["wsl", "-d", WSL_DISTRO, "docker", "compose", "up", "-d"] + BACKEND_SERVICES
        subprocess.run(compose_cmd, check=True)
    except subprocess.CalledProcessError:
        print("[Error] Docker Compose failed. Check your Ubuntu setup.")
        sys.exit(1)

    # 4. Frontend Setup & Run (on Windows)
    print_step("Preparing Frontend...")
    if not os.path.exists(os.path.join(FRONTEND_DIR, "node_modules")):
        print("node_modules not found. Running 'npm install' (this may take a minute)...")
        subprocess.run(["npm", "install"], cwd=FRONTEND_DIR, shell=True)

    print("Starting Frontend Dev Server...")
    frontend_cmd = f"cd {FRONTEND_DIR}; npm run dev"
    run_in_new_window(frontend_cmd, "SBAY-Frontend")

    print("\n" + "="*42)
    print("  SYSTEM IS STARTING UP!")
    print("  - Frontend: http://localhost:3000")
    print("  - Backend API: http://localhost:8080/api")
    print("  - DB Admin: http://localhost:8081")
    print("="*42)
    print("\nKeep this window open or close it if everything is running.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nShutdown requested.")
