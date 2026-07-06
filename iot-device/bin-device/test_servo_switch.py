import time
import RPi.GPIO as GPIO
import hardware.servo as servo

# กำหนด Pin สำหรับสวิตช์ทั้ง 3 ตัว (โหมด BCM)
# สามารถเปลี่ยนตัวเลข Pin ได้ตามที่คุณต่อสายไว้จริง
SW_PLASTIC = 22
SW_CAN = 23
SW_CARTON = 24
SW_RESET = 25

def setup_switches():
    # ใช้ Internal Pull-Up Resistor
    # สถานะปกติจะเป็น HIGH (1), เมื่อกดปุ่มที่ต่อกับสาย GND จะกลายเป็น LOW (0)
    GPIO.setup(SW_PLASTIC, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.setup(SW_CAN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.setup(SW_CARTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.setup(SW_RESET, GPIO.IN, pull_up_down=GPIO.PUD_UP)

def run_test():
    setup_switches()
    servo.reset_position()
    
    print("="*50)
    print("🔧 เริ่มการทดสอบ Servo ด้วยปุ่มกด 3 ตัว")
    print(f" - สวิตช์ 1 (Pin BCM {SW_PLASTIC}) : จำลอง ขวดพลาสติก (ตรงกลาง)")
    print(f" - สวิตช์ 2 (Pin BCM {SW_CAN}) : จำลอง กระป๋องอลูมิเนียม (ขวาล่าง)")
    print(f" - สวิตช์ 3 (Pin BCM {SW_CARTON}) : จำลอง กล่องกระดาษ (ซ้ายล่าง)")
    print(f" - สวิตช์ 4 (Pin BCM {SW_RESET}) : รีเซ็ต Servo กลับค่าเริ่มต้น (จุดศูนย์)")
    print("💡 วิธีต่อ: ขาข้างหนึ่งของปุ่มต่อ Pin ขาอีกข้างต่อ GND")
    print("กด Ctrl+C เพื่อออกจากโปรแกรม")
    print("="*50)

    try:
        while True:
            # ถ้าปุ่มถูกกด (เชื่อมกับ GND) สถานะจะเป็น LOW (0)
            if GPIO.input(SW_PLASTIC) == GPIO.LOW:
                while GPIO.input(SW_PLASTIC) == GPIO.LOW:
                    time.sleep(0.05) # รอจนกว่าจะปล่อยปุ่ม
                print("\n🎯 ปล่อยปุ่ม 1: แยกขวดพลาสติก (90 องศา)")
                servo.sort_item("PLASTIC_BOTTLE")
                time.sleep(0.5)
                servo.release_item("PLASTIC_BOTTLE")
                print("✅ เสร็จสิ้นกระบวนการ กลับสู่สแตนด์บาย")
                time.sleep(1)
                
            elif GPIO.input(SW_CAN) == GPIO.LOW:
                while GPIO.input(SW_CAN) == GPIO.LOW:
                    time.sleep(0.05)
                print("\n🎯 ปล่อยปุ่ม 2: แยกกระป๋อง (30 องศา)")
                servo.sort_item("ALUMINUM_CAN")
                time.sleep(0.5)
                servo.release_item("ALUMINUM_CAN")
                print("✅ เสร็จสิ้นกระบวนการ กลับสู่สแตนด์บาย")
                time.sleep(1)
                
            elif GPIO.input(SW_CARTON) == GPIO.LOW:
                while GPIO.input(SW_CARTON) == GPIO.LOW:
                    time.sleep(0.05)
                print("\n🎯 ปล่อยปุ่ม 3: แยกกล่องกระดาษ (150 องศา)")
                servo.sort_item("BEVERAGE_CARTON")
                time.sleep(0.5)
                servo.release_item("BEVERAGE_CARTON")
                print("✅ เสร็จสิ้นกระบวนการ กลับสู่สแตนด์บาย")
                time.sleep(1)
                
            elif GPIO.input(SW_RESET) == GPIO.LOW:
                while GPIO.input(SW_RESET) == GPIO.LOW:
                    time.sleep(0.05)
                print("\n🔄 ปล่อยปุ่ม 4: สั่งรีเซ็ตเซอร์โวกลับค่าเริ่มต้น (จุดศูนย์)")
                servo.reset_position()
                print("✅ รีเซ็ตเสร็จสิ้น")
                time.sleep(1)
                
            time.sleep(0.1) # ป้องกัน CPU ลูปเร็วเกินไป

    except KeyboardInterrupt:
        print("\n\n🛑 ยกเลิกการทดสอบ")
    finally:
        servo.cleanup()
        print("👋 คืนค่า GPIO และปิดโปรแกรมเรียบร้อย")

if __name__ == "__main__":
    run_test()
