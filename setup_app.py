import os
import subprocess
import sys
import platform
import shutil

def check_docker_wsl():
    """Check if Docker is running in WSL (Ubuntu)."""
    print("Checking Docker status in WSL...")
    try:
        # Check if wsl is installed
        subprocess.run(["wsl", "--status"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Check if docker is running inside Ubuntu
        # We use -d Ubuntu to specify the distro
        result = subprocess.run(["wsl", "-d", "Ubuntu", "docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if result.returncode == 0:
            print("Docker is running in WSL (Ubuntu).")
            return True
        else:
            print("Docker is NOT running in WSL.")
            return False
    except FileNotFoundError:
        print("WSL is not installed or not found.")
        return False
    except subprocess.CalledProcessError:
        print("WSL check failed.")
        return False

def install_frontend_deps():
    print("Checking Frontend dependencies...")
    frontend_dir = "frontend"
    node_modules = os.path.join(frontend_dir, "node_modules")
    
    # Simple check if node_modules exists
    if not os.path.exists(node_modules):
        print("Installing frontend dependencies...")
        try:
            subprocess.run("npm install --legacy-peer-deps", cwd=frontend_dir, shell=True, check=True)
            print("Frontend dependencies installed.")
        except subprocess.CalledProcessError:
            print("Failed to install frontend dependencies.")
            sys.exit(1)
    else:
        print("Frontend dependencies found. Skipping install.")

def install_iot_deps():
    print("Checking IoT Device dependencies...")
    iot_dir = "iot-device"
    req_file = "requirements.txt"
    abs_req_file = os.path.join(iot_dir, req_file)
    
    if os.path.exists(abs_req_file):
        try:
            # We assume pip is in path
            subprocess.run(["pip", "install", "-r", req_file], cwd=iot_dir, shell=True, check=True)
            print("IoT dependencies installed.")
        except subprocess.CalledProcessError:
            print("Failed to install IoT dependencies.")
            sys.exit(1)
    else:
        print("No requirements.txt found for IoT device.")

def setup_docker_wsl():
    """Tips for setting up Docker in WSL if check fails."""
    if not check_docker_wsl():
        print("\n[!] Docker is not detected in WSL (Ubuntu).")
        print("If you haven't installed Docker in WSL yet, please run:")
        print("  wsl -d Ubuntu -e bash setup_docker.sh")
        print("\nIf installed but not running, try starting it with:")
        print("  wsl -d Ubuntu sudo service docker start")
        
        choice = input("\nDo you want to try starting Docker service in WSL? (y/n): ")
        if choice.lower() == 'y':
            try:
                subprocess.run(["wsl", "-d", "Ubuntu", "sudo", "service", "docker", "start"], shell=True, check=True)
                print("Service start command sent.")
            except subprocess.CalledProcessError:
                print("Failed to start Docker service.")

def main():
    print("=== SBAY Application Setup ===\n")
    
    # 1. Frontend Setup
    install_frontend_deps()
    
    # 2. IoT Setup
    install_iot_deps()
    
    # 3. Docker Setup Check
    setup_docker_wsl()
    
    print("\n=== Setup Complete ===")
    print("You can now run the app using: python run_app.py")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSetup interrupted by user.")
