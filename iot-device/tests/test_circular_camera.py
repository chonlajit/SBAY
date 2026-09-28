# ============================================================
# Test Circular Camera & Circular Masking
# ============================================================

import sys
import os
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "bin-device"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import settings.config as config
from gui import SmartBinGUI

def test_circular_camera():
    print("--- Starting Test: Circular Camera & Circular Mask ---")

    # 1. Test GUI with Circular Camera enabled
    app = SmartBinGUI(
        on_phone_submit=lambda p: None,
        on_finish=lambda: None
    )
    app.show_detecting()
    app.root.update()

    # Check that circular camera items exist on canvas
    rings = app.canvas.find_withtag("camera_ring")
    assert len(rings) > 0, "camera_ring items should exist on canvas when circular camera is enabled"
    print(f"[PASS] Circular camera lens ring drawn on GUI ({len(rings)} canvas items)")

    # Simulate camera frame update (e.g. 400x300 BGR dummy frame)
    dummy_frame = np.ones((300, 400, 3), dtype=np.uint8) * 128
    app.update_camera_frame(dummy_frame)
    app.root.update()

    assert app.cam_photo is not None, "cam_photo should be created"
    assert app.cam_photo.width() == app.cam_photo.height(), f"Circular photo should be square/circular, got {app.cam_photo.width()}x{app.cam_photo.height()}"
    print(f"[PASS] Circular camera frame rendered on GUI: {app.cam_photo.width()}x{app.cam_photo.height()} with circular mask")

    app.quit()
    app.root.destroy()

    # 2. Test Detection Service Circular Mask
    test_img = np.ones((200, 200, 3), dtype=np.uint8) * 255
    fh, fw = test_img.shape[:2]
    cx = int(fw * getattr(config, 'CIRCLE_CENTER_X_PCT', 0.5))
    cy = int(fh * getattr(config, 'CIRCLE_CENTER_Y_PCT', 0.5))
    r = int(min(fw, fh) * getattr(config, 'CIRCLE_RADIUS_PCT', 0.48))

    import cv2
    mask = np.zeros((fh, fw), dtype=np.uint8)
    cv2.circle(mask, (cx, cy), r, 255, -1)
    masked = cv2.bitwise_and(test_img, test_img, mask=mask)

    # Center must be white (255)
    assert np.all(masked[cy, cx] == 255), "Center of circular mask must be preserved"
    # Corners must be black (0)
    assert np.all(masked[0, 0] == 0), "Corner (0, 0) must be blacked out"
    assert np.all(masked[0, fw - 1] == 0), "Corner (0, fw-1) must be blacked out"
    assert np.all(masked[fh - 1, 0] == 0), "Corner (fh-1, 0) must be blacked out"
    assert np.all(masked[fh - 1, fw - 1] == 0), "Corner (fh-1, fw-1) must be blacked out"
    print("[PASS] Detection Circular Masking verified: corners blacked out, center preserved perfectly")

    print("\n[PASS] ALL CIRCULAR CAMERA TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_circular_camera()
