# ============================================================
# Test Finish Button Disable on Detect & Secret Reset Hotspot
# ============================================================

import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "bin-device"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from gui import SmartBinGUI

def test_finish_button_disable_and_hotspot():
    print("--- Starting Test: Finish Button & Secret Reset Hotspot ---")

    finish_called = [False]
    def mock_finish():
        finish_called[0] = True

    reload_called = [False]

    app = SmartBinGUI(
        on_phone_submit=lambda p: None,
        on_finish=mock_finish
    )
    # Mock reload to verify secret hotspot trigger
    app._on_reload = lambda: reload_called.__setitem__(0, True)

    app.root.update()

    # 1. Test Phone Screen: Invisible Corner Hotspot exists without waiting for server status
    print("\n[1] Testing Secret Reset Hotspot on Phone Screen...")
    app.show_phone_input()
    app.root.update()

    hotspot_items = app.canvas.find_withtag("secret_reset_hotspot")
    assert len(hotspot_items) > 0, "secret_reset_hotspot should exist immediately on phone screen"
    print("[PASS] Invisible corner hotspot exists immediately on phone screen without waiting for server status")

    # Tap 4 times -> should not reload yet
    for _ in range(4):
        app._on_secret_reload_tap()
    assert reload_called[0] is False, "Reload should not trigger on 4 taps"

    # Tap 5th time -> should trigger reload
    app._on_secret_reload_tap()
    assert reload_called[0] is True, "Reload should trigger on 5th tap"
    print("[PASS] Secret reload triggered successfully after 5 rapid taps on corner hotspot")

    # 2. Test Detecting Screen: Finish button enabled on Standby
    print("\n[2] Testing Finish Button on Detecting Screen (Standby vs Detect)...")
    app.show_detecting()
    app.root.update()

    assert app.finish_btn_enabled is True, "Finish button should be enabled by default on Standby"
    
    # Check button text on standby
    title_items = app.canvas.find_withtag("finish_btn_title")
    assert len(title_items) > 0, "finish_btn_title item should exist"
    title_text = app.canvas.itemcget(title_items[0], "text")
    assert "เสร็จสิ้น" in title_text, f"Expected finish text, got {title_text}"

    # 3. Simulate detection status -> Finish button should be DISABLED
    finish_called[0] = False
    app.update_status("กำลังรับขยะเข้าสู่ช่องวิเคราะห์...", "#eab308")
    app.root.update()

    assert app.finish_btn_enabled is False, "Finish button should be disabled when status is 'กำลังรับขยะ...'"
    title_text_detect = app.canvas.itemcget(title_items[0], "text")
    assert "กำลังตรวจจับ" in title_text_detect, f"Expected detecting text, got {title_text_detect}"

    # Attempt to click finish while in detect status
    app._handle_finish()
    app.root.update()
    assert finish_called[0] is False, "Finish callback MUST NOT be called when in detect status"
    print("[PASS] Finish button is disabled and unclickable during detection status (step 1)")

    # Test another detecting message: "กำลังเปิดกล้องและวิเคราะห์..."
    app.update_status("กำลังเปิดกล้องและวิเคราะห์...", "#eab308")
    app.root.update()
    assert app.finish_btn_enabled is False, "Finish button should stay disabled when status is detecting"
    app._handle_finish()
    app.root.update()
    assert finish_called[0] is False, "Finish callback MUST NOT be called when in detect status"
    print("[PASS] Finish button stays disabled during detecting step 2")

    # 4. Return to Standby -> Finish button should re-enable
    app.update_status("สแตนด์บาย: รอการหยอดขยะ", "#94a3b8")
    app.root.update()
    assert app.finish_btn_enabled is True, "Finish button should re-enable on standby status"
    
    app._handle_finish()
    app.root.update()
    assert finish_called[0] is True, "Finish callback should be invoked when in standby"
    print("[PASS] Finish button successfully re-enabled on standby and became clickable")

    # 5. Test Transition from Idle to Phone: No bounce on phone screen
    print("\n[3] Testing Idle to Phone Transition: No Bouncing on Phone Screen...")
    app.show_idle()
    app.root.update()
    assert app.idle_face is not None
    assert app.idle_face._transitioning is False

    # Wake up
    app.idle_face.on_tap()
    assert app.idle_face.state == "waking"

    # Rapid tap to bounce (sleep 0.08s to pass debounce)
    time.sleep(0.08)
    app.idle_face.on_tap()
    assert app.idle_face.state == "bouncing"

    # Release timeout triggers transition
    app.idle_face._on_release_timeout()
    assert app.idle_face._transitioning is True, "_transitioning flag should be True"
    assert app.idle_face.state == "transitioning", "State should be transitioning"

    # Further taps must be ignored
    app.idle_face.on_tap()
    assert app.idle_face.state == "transitioning", "Taps must not change state back to bouncing"
    print("[PASS] Releasing to transition to phone locks out bouncing immediately")

    # Clean up
    app.quit()
    app.root.destroy()
    print("\n[PASS] ALL FINISH & HOTSPOT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_finish_button_disable_and_hotspot()
