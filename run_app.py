import os
import subprocess
import time
import sys
import platform
import shutil

def check_docker_wsl(silent=False):
    """Check if Docker is running in WSL (Ubuntu)."""
    if not silent:
        print("Checking Docker status in WSL...", end="", flush=True)
    
    try:
        # Check if docker is running inside Ubuntu
        result = subprocess.run(["wsl", "-d", "Ubuntu", "docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if result.returncode == 0:
            if not silent: print(" Found.")
            return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
        
    if not silent: print(" Not running.")
    return False

def start_docker_wsl():
    """Attempt to start Docker service in WSL (Ubuntu)."""
    print("Attempting to start Docker in WSL (Ubuntu)...")
    try:
        # Check if WSL Ubuntu exists
        subprocess.run(["wsl", "-d", "Ubuntu", "true"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Try to start service using the password-less sudo rule we set up
        print("Starting Docker service...")
        # Redirect output to null to keep it clean
        subprocess.run(["wsl", "-d", "Ubuntu", "sudo", "service", "docker", "start"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError:
        print("Failed to start Docker in WSL.")
        return False

def ensure_docker_ready():
    """Ensure Docker is running in WSL."""
    if check_docker_wsl():
        return True

    # Try to start
    start_docker_wsl()
    
    # Wait loop
    print("Waiting for Docker to become ready...", end="", flush=True)
    for _ in range(40):
        if check_docker_wsl(silent=True):
            print("\nDocker started successfully!")
            return True
        time.sleep(2)
        print(".", end="", flush=True)
    
    print("\n[Error] Could not start Docker in WSL. Please check your installation.")
    return False

def run_command_in_new_window(command, title="Command"):
    """Runs a command in a new PowerShell window."""
    full_cmd = f'start "{title}" powershell -NoExit -Command "{command}"'
    subprocess.run(full_cmd, shell=True)

def main():
    print("=== SBAY Application Launcher (WSL Edition) ===\n")

    # 1. Ensure Docker is ready (WSL only)
    if not ensure_docker_ready():
        sys.exit(1)

    # 2. Start Docker Containers
    print("Starting Docker Containers (Backend & DB)...")
    try:
        # We must use 'wsl' to invoke docker-compose inside Ubuntu
        cmd = ["wsl", "-d", "Ubuntu", "docker", "compose", "up", "-d", "backend", "mongodb"]
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError:
        print("Failed to start docker-compose services. Attempting fallback command...")
        try:
             # Fallback for older compose v1
            subprocess.run(["wsl", "-d", "Ubuntu", "docker-compose", "up", "-d", "backend", "mongodb"], check=True)
        except subprocess.CalledProcessError:
            print("[Error] Failed to start Docker containers.")
            sys.exit(1)

    # 3. Wait for Backend (Increased to 8s for safety)
    print("Waiting for Backend to initialize (8s)...")
    time.sleep(8)

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
