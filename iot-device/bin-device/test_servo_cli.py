import time
import sys
import hardware.servo as servo

def run_cli():
    print("="*50)
    print("🤖 ระบบทดสอบ Servo ด้วย Command Line")
    print("="*50)
    
    # รีเซ็ต Servo ให้อยู่ตำแหน่งศูนย์ตอนเริ่มโปรแกรม
    print("กำลังรีเซ็ต Servo ไปที่จุดเริ่มต้น...")
    servo.reset_position()
    time.sleep(1)
    
    try:
        while True:
            print("\n" + "-"*30)
            print("กรุณาเลือกประเภทขยะที่ต้องการจำลอง:")
            print("1. ขวดพลาสติก (PLASTIC_BOTTLE)")
            print("2. กระป๋อง (ALUMINUM_CAN)")
            print("3. กล่องกระดาษ (BEVERAGE_CARTON)")
            print("d. ทดสอบ Servo รับขวด (Drop Servo)")
            print("u. ทดสอบ Servo คืนขวด (Return Servo)")
            print("r. รีเซ็ตมอเตอร์ (Reset Position)")
            print("q. ออกจากโปรแกรม (Quit)")
            
            choice = input("👉 ใส่ตัวเลือก (1/2/3/d/u/r/q): ").strip().lower()
            
            if choice == 'q':
                print("👋 กำลังออกจากโปรแกรม...")
                break
            elif choice == 'r':
                print("🔄 กำลังรีเซ็ตมอเตอร์กลับสู่จุดศูนย์...")
                servo.reset_position()
                time.sleep(1)
            elif choice == 'd':
                print("⏬ จำลองการรับขวด (เปิดแล้วปิด)")
                servo.drop_item()
                time.sleep(1)
            elif choice == 'u':
                print("🔙 จำลองการคืนขวด (เปิดแล้วปิด)")
                servo.return_item()
                time.sleep(1)
            elif choice == '1':
                print("♻️ จำลองการทิ้ง: ขวดพลาสติก")
                servo.sort_item("PLASTIC_BOTTLE")
                time.sleep(1)
                servo.release_item("PLASTIC_BOTTLE")
            elif choice == '2':
                print("♻️ จำลองการทิ้ง: กระป๋องอลูมิเนียม")
                servo.sort_item("ALUMINUM_CAN")
                time.sleep(1)
                servo.release_item("ALUMINUM_CAN")
            elif choice == '3':
                print("♻️ จำลองการทิ้ง: กล่องกระดาษ")
                servo.sort_item("BEVERAGE_CARTON")
                time.sleep(1)
                servo.release_item("BEVERAGE_CARTON")
            else:
                print("❌ ตัวเลือกไม่ถูกต้อง กรุณาลองใหม่")
                
    except KeyboardInterrupt:
        print("\n🛑 หยุดการทำงานโดยผู้ใช้")
    finally:
        print("🧹 กำลังเคลียร์ค่า GPIO...")
        servo.cleanup()
        print("✅ เสร็จสิ้น")

if __name__ == "__main__":
    run_cli()
