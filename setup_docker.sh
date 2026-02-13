#!/bin/bash

# Auto-setup Docker on Ubuntu WSL2
# Run this inside your WSL Ubuntu terminal

echo "=== Starting Docker Installation for WSL2 (Ubuntu) ==="

# 1. Update and Install Prerequisites
echo "[1/6] Updating package lists..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 2. Add Docker's official GPG key
echo "[2/6] Adding Docker GPG key..."
sudo mkdir -p /etc/apt/keyrings
if [ -f /etc/apt/keyrings/docker.gpg ]; then
    sudo rm /etc/apt/keyrings/docker.gpg
fi
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 3. Set up the repository
echo "[3/6] Setting up Docker repository..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine
echo "[4/6] Installing Docker Engine..."
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose

# 5. User Group Configuration (Run Docker without sudo)
echo "[5/6] Configuring user permissions..."
sudo usermod -aG docker $USER

# 6. Enable Systemd (Required for Docker service)
echo "[6/6] checking systemd config..."
if ! grep -q "systemd=true" /etc/wsl.conf 2>/dev/null; then
    echo "Enabling systemd in /etc/wsl.conf..."
    echo -e "[boot]\nsystemd=true" | sudo tee -a /etc/wsl.conf
    echo "NOTICE: You will need to restart WSL for systemd changes to take effect."
    echo "Run 'wsl --shutdown' in PowerShell after this script finishes."
fi

echo "=== Installation Complete! ==="
echo "To finish setup:"
echo "1. Run 'wsl --shutdown' in PowerShell to restart WSL."
echo "2. Open Ubuntu again."
echo "3. Test with 'docker run hello-world'."
echo "=============================="
