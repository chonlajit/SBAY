import os
import subprocess
import time
import sys
import platform
import shutil

def check_docker_running():
    """Check if Docker is running (Desktop or WSL)."""
    print("Checking Docker status...")
    try:
        # Check standard docker command
        subprocess.run(["docker", "info"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("Docker is running.")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def start_docker_desktop():
    """Attempt to start Docker Desktop."""
    print("Attempting to start Docker Desktop...")
    docker_path = r"C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    if os.path.exists(docker_path):
        try:
            subprocess.Popen(docker_path)
            print("Waiting for Docker Desktop to initialize...")
            return True
        except Exception as e:
            print(f"Failed to start Docker Desktop: {e}")
            return False
    return False

def start_docker_wsl():
    """Attempt to start Docker service in WSL (Ubuntu)."""
    print("Attempting to start Docker in WSL (Ubuntu)...")
    try:
        # Check if WSL Ubuntu exists
        subprocess.run(["wsl", "-d", "Ubuntu", "true"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Try to start service (might ask for password if not configured sudo-less)
        print("Run 'wsl -d Ubuntu sudo service docker start'...")
        subprocess.run(["wsl", "-d", "Ubuntu", "sudo", "service", "docker", "start"], check=True)
        return True
    except subprocess.CalledProcessError:
        print("Failed to start Docker in WSL.")
        return False

def ensure_docker_ready():
    """Ensure Docker is running, trying to start it if needed."""
    if check_docker_running():
        return True

    print("Docker is not running.")
    
    # Try WSL first (as requested preferred method)
    started_wsl = start_docker_wsl()
    
    # Wait loop
    print("Waiting for Docker to become ready...")
    for _ in range(30):
        if check_docker_running():
            print("Docker started successfully!")
            return True
        time.sleep(2)
        print(".", end="", flush=True)
    
    # If still not running, try Desktop as fallback
    if not started_wsl:
        print("\nWSL start failed or timed out. Trying Docker Desktop...")
        if start_docker_desktop():
            for _ in range(40):
                if check_docker_running():
                    print("Docker Desktop started!")
                    return True
                time.sleep(3)
                print(".", end="", flush=True)
    
    print("\n[Error] Could not start Docker. Please start it manually.")
    return False

def run_command_in_new_window(command, title="Command"):
    """Runs a command in a new PowerShell window."""
    full_cmd = f'start "{title}" powershell -NoExit -Command "{command}"'
    subprocess.run(full_cmd, shell=True)

def main():
    print("=== SBAY Application Launcher ===\n")

    # 1. Ensure Docker is ready
    if not ensure_docker_ready():
        sys.exit(1)

    # 2. Start Docker Containers
    print("Starting Docker Containers (Backend & DB)...")
    try:
        subprocess.run("docker-compose up -d backend mongodb", shell=True, check=True)
    except subprocess.CalledProcessError:
        print("Failed to start docker-compose services.")
        sys.exit(1)

    # 3. Wait for Backend
    print("Waiting for Backend to initialize (5s)...")
    time.sleep(5)

    # 4. Start Frontend (npm run dev)
    print("Starting Frontend (npm run dev)...")
    frontend_ps_cmd = "Set-Location frontend; $env:NODE_OPTIONS='--max-old-space-size=4096'; npm run dev"
    run_command_in_new_window(frontend_ps_cmd, "Frontend Service")

    # 5. Start Webcam Script
    print("Starting Webcam Detector...")
    webcam_ps_cmd = "python iot-device/webcam_detector.py"
    run_command_in_new_window(webcam_ps_cmd, "Webcam Detector")

    print("\nAll systems GO!")
    print("Frontend: http://localhost:3000")
    print("Admin QR: http://localhost:3000/admin/qr")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nLauncher interrupted by user.")
