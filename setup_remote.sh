#!/bin/bash
# SBAY - REMOTE ACCESS SETUP (Linux Format)
set -e

echo "=========================================="
echo "   SBAY - REMOTE ACCESS SETUP (SSH & Tailscale)"
echo "=========================================="

sudo apt update
sudo apt install openssh-server -y

sudo systemctl enable ssh || true
sudo service ssh start

curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

echo "=========================================="
echo "   ตั้งค่าเสร็จสมบูรณ์!"
echo "=========================================="
