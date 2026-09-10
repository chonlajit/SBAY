@echo off
echo ==========================================
echo   SBAY IoT Device - Windows Setup
echo ==========================================

echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.
    pause
    exit /b
)

echo.
echo [1/3] Creating virtual environment (venv)...
if not exist "venv\" (
    python -m venv venv
)

echo [2/3] Activating virtual environment...
call venv\Scripts\activate

echo [3/3] Installing required libraries...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo To start developing or running the code, please run:
echo 1. venv\Scripts\activate
echo 2. cd bin-device
echo 3. python main.py  (or python webcam_detector.py in iot-device folder)
echo ==========================================
pause
