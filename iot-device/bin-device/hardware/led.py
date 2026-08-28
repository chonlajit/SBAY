import logging
import config

logger = logging.getLogger("led")

LED_ENABLED = False
bin_full_led = None

try:
    if config.USE_HARDWARE:
        from gpiozero import LED
        if hasattr(config, 'LED_BIN_FULL_PIN') and config.LED_BIN_FULL_PIN is not None:
            bin_full_led = LED(config.LED_BIN_FULL_PIN)
            LED_ENABLED = True
            logger.info(f"Bin Full LED initialized on GPIO {config.LED_BIN_FULL_PIN}")
except Exception as e:
    logger.error(f"LED init failed: {e}")

def set_bin_full_status(is_full: bool):
    """เปิด-ปิดไฟ LED สถานะถังเต็ม"""
    if LED_ENABLED and bin_full_led:
        if is_full:
            bin_full_led.on()
        else:
            bin_full_led.off()

def cleanup():
    """ทำความสะอาดพิน LED เมื่อปิดโปรแกรม"""
    if LED_ENABLED and bin_full_led:
        bin_full_led.off()
        bin_full_led.close()
