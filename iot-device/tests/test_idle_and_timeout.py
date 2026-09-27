# ============================================================
# Test Idle Screen Redesign, Total Waste Graph, and Inactivity Timeouts
# ============================================================

import sys
import os
import time

# Ensure bin-device is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "bin-device"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from gui import SmartBinGUI
from idle_animation import IdleSleepingFace

def test_idle_and_timeouts():
    print("--- Starting Test: Idle Screen & Timeouts ---")
    mock_levels = {
        "PLASTIC_BOTTLE": 70.0,
        "ALUMINUM_CAN": 50.0,
        "BEVERAGE_CARTON": 30.0,
    }

    finish_called = [False]
    def mock_finish():
        finish_called[0] = True
        print("[TEST] on_finish callback was invoked!")

    # 1. Instantiate GUI
    app = SmartBinGUI(
        on_phone_submit=lambda p: None,
        on_finish=mock_finish,
        get_waste_levels=lambda: mock_levels
    )

    # Let Tkinter process idle events
    app.root.update()

    # 2. Check idle screen elements
    assert app.page == "idle", f"Expected page 'idle', got '{app.page}'"
    assert app.idle_face is not None, "idle_face should be initialized"

    # Check 3 gauge bars exist in idle_face
    gauges = app.idle_face.gauge_items
    assert "PLASTIC_BOTTLE" in gauges, "PLASTIC_BOTTLE gauge missing"
    assert "ALUMINUM_CAN" in gauges, "ALUMINUM_CAN gauge missing"
    assert "BEVERAGE_CARTON" in gauges, "BEVERAGE_CARTON gauge missing"
    assert "TOTAL" not in gauges, "TOTAL gauge should not exist (3 tubes only)"

    # Check vector icons loaded
    icons = app.idle_face.waste_icons
    assert "PLASTIC_BOTTLE" in icons, "PLASTIC_BOTTLE icon missing"
    assert "ALUMINUM_CAN" in icons, "ALUMINUM_CAN icon missing"
    assert "BEVERAGE_CARTON" in icons, "BEVERAGE_CARTON icon missing"
    print("[PASS] Vector icons loaded successfully for all 3 categories")

    # Check gauge values
    app.idle_face.update_waste_display(mock_levels)
    app.root.update()

    bottle_pct_text = app.canvas.itemcget(gauges["PLASTIC_BOTTLE"]["pct_item"], "text")
    can_pct_text = app.canvas.itemcget(gauges["ALUMINUM_CAN"]["pct_item"], "text")
    carton_pct_text = app.canvas.itemcget(gauges["BEVERAGE_CARTON"]["pct_item"], "text")
    assert bottle_pct_text == "70%", f"Expected bottle 70%, got {bottle_pct_text}"
    assert can_pct_text == "50%", f"Expected can 50%, got {can_pct_text}"
    assert carton_pct_text == "30%", f"Expected carton 30%, got {carton_pct_text}"
    print("[PASS] 3 waste levels rendered correctly: 70%, 50%, 30%")

    # Check dynamic update with set_waste_levels
    app.set_waste_levels({"PLASTIC_BOTTLE": 90.0, "ALUMINUM_CAN": 60.0, "BEVERAGE_CARTON": 40.0})
    app.root.update()
    new_bottle_pct = app.canvas.itemcget(gauges["PLASTIC_BOTTLE"]["pct_item"], "text")
    assert new_bottle_pct == "90%", f"Expected new bottle 90%, got {new_bottle_pct}"
    print("[PASS] Dynamic waste levels update working: 90%")

    # 3. Test Inactivity Timeout on Phone Screen (ตั้งค่า timeout สั้น 100ms เพื่อทดสอบ)
    print("\n--- Testing Phone Screen Timeout ---")
    app.show_phone_input()
    app.add_digit("0")
    app.add_digit("8")
    app.add_digit("1")
    assert app.phone == "081", f"Expected phone '081', got '{app.phone}'"
    assert app.page == "phone"

    # Set short timeout to verify return to idle
    app._reset_inactivity_timer(0.15)
    start_t = time.time()
    while app.page != "idle" and time.time() - start_t < 2.0:
        time.sleep(0.02)
        app.root.update()

    assert app.page == "idle", f"Phone screen should timeout to 'idle', got '{app.page}'"
    assert app.phone == "", f"Phone should be reset to empty, got '{app.phone}'"
    print("[PASS] Phone screen timed out and returned to Idle screen with phone cleared")

    # 4. Test Inactivity Timeout on Detecting Screen -> Auto Finish & Result
    print("\n--- Testing Detecting Screen Timeout ---")
    app.show_detecting()
    assert app.page == "detecting"
    app.add_detected_item("PLASTIC_BOTTLE", 500, 2.0)
    assert len(app.items_list) == 1

    # Set short timeout to verify auto-finish
    finish_called[0] = False
    app._reset_inactivity_timer(0.15)
    time.sleep(0.2)
    app.root.update()

    assert finish_called[0] is True, "on_finish should be called on detecting timeout"
    print("[PASS] Detecting screen timed out -> automatically called on_finish to save data and show result")

    # 5. Test Inactivity Timeout Reset on Phone Error Alert & Close Alert
    print("\n--- Testing Inactivity Timeout Reset on Phone Error Alert ---")
    app.show_phone_input()
    app.phone = "08123"  # Incomplete phone (error)
    timer_before = app._inactivity_timer
    time.sleep(0.05)
    app.show_alert("ตรวจสอบหมายเลขโทรศัพท์", "กรุณากรอกหมายเลขให้ครบ 10 หลัก", alert_type="warning")
    app.root.update()
    assert app.alert_active is True, "Alert modal should be active"
    assert app._inactivity_timer is not None, "Inactivity timer should be scheduled"
    assert app._inactivity_timer != timer_before, "Inactivity timer should have been reset on alert popup"

    timer_during_alert = app._inactivity_timer
    time.sleep(0.05)
    app.close_alert()
    app.root.update()
    assert app.alert_active is False, "Alert modal should be closed"
    assert app._inactivity_timer != timer_during_alert, "Inactivity timer should have been reset on alert close"
    print("[PASS] Inactivity timer resets properly on alert display and alert close")

    # 6. Test Inactivity Timeout Reset on Detecting Error & Standby Status
    print("\n--- Testing Inactivity Timeout Reset on Detecting Error Status ---")
    app.show_detecting()
    timer_detect_before = app._inactivity_timer
    time.sleep(0.05)
    # Simulate error status (item not found / returned / full)
    app.update_status("ไม่พบขวด หรือขยะไม่ถูกต้อง (คืนขวดแล้ว)...", "#ef4444")
    app.root.update()
    assert app._inactivity_timer != timer_detect_before, "Inactivity timer should reset when error status is shown"

    timer_after_error = app._inactivity_timer
    time.sleep(0.05)
    # Simulate standby status
    app.update_status("สแตนด์บาย: รอการหยอดขยะ (เซ็นเซอร์อินฟาเรด)", "#94a3b8")
    app.root.update()
    assert app._inactivity_timer != timer_after_error, "Inactivity timer should reset when returning to standby"
    print("[PASS] Inactivity timer resets properly on detection error status and standby return")

    # 7. Test Public reset_inactivity method
    print("\n--- Testing reset_inactivity Method ---")
    timer_prior = app._inactivity_timer
    time.sleep(0.05)
    app.reset_inactivity()
    app.root.update()
    assert app._inactivity_timer != timer_prior, "reset_inactivity() should reset the inactivity timer"
    print("[PASS] reset_inactivity() successfully refreshed the inactivity timer")

    # 8. Test Idle Screen Multi-Tap Bouncing & Single Tap Wake Up
    print("\n--- Testing Idle Screen Multi-Tap Bouncing & Single Tap ---")
    wake_callback_called = [False]
    def on_wake():
        wake_callback_called[0] = True

    idle_test_face = IdleSleepingFace(
        root=app.root,
        container=app.container,
        width=960,
        height=540,
        on_wake_complete=on_wake
    )
    idle_test_face.start()
    app.root.update()
    assert idle_test_face.state == "sleeping", "Initial state should be sleeping"

    # Tap once -> should enter waking
    idle_test_face.on_tap()
    app.root.update()
    assert idle_test_face.state == "waking", f"Expected waking, got {idle_test_face.state}"
    assert idle_test_face.tap_count == 1, "tap_count should be 1"

    # Tap again rapidly (กดย้ำๆๆ) -> should enter bouncing
    time.sleep(0.08)
    idle_test_face.on_tap()
    app.root.update()
    assert idle_test_face.state == "bouncing", f"Expected bouncing on rapid tap, got {idle_test_face.state}"
    assert idle_test_face.tap_count == 2, "tap_count should be 2"

    # Tap third time -> stays bouncing, increments tap count
    time.sleep(0.08)
    idle_test_face.on_tap()
    app.root.update()
    assert idle_test_face.state == "bouncing", f"Expected bouncing, got {idle_test_face.state}"
    assert idle_test_face.tap_count == 3, "tap_count should be 3"
    print("[PASS] Repeated tapping triggers bouncy state and increases tap count")

    # Now release (stop tapping) -> after release delay, should complete wake
    # Temporarily set release timer shorter to verify release transition
    if idle_test_face.release_timer:
        app.root.after_cancel(idle_test_face.release_timer)
    idle_test_face.release_timer = app.root.after(100, idle_test_face._on_release_timeout)

    start_release_t = time.time()
    while not wake_callback_called[0] and time.time() - start_release_t < 2.0:
        time.sleep(0.02)
        app.root.update()

    assert wake_callback_called[0] is True, "Wake callback should be called after releasing"
    print("[PASS] Releasing after repeated taps successfully proceeds to next screen")

    idle_test_face.stop()

    # Clean up
    app.quit()
    app.root.destroy()
    print("\n[PASS] ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_idle_and_timeouts()
