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

    # Clean up
    app.quit()
    app.root.destroy()
    print("\n[PASS] ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_idle_and_timeouts()
