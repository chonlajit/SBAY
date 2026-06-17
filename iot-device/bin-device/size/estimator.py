class SizeEstimator:

    def get_size_ml(self, height):
        # ----------------------------------------------------
        # Calibrated for Raspberry Pi Camera (OV5647) 
        # Resolution: 640x480, Distance: ~30 cm.
        # At 30 cm, 480 pixels ≈ 23-24 cm in real life.
        # ----------------------------------------------------
        if height < 150:      # < 7 cm
            return 150
        elif height < 230:    # ~ 11 cm
            return 200
        elif height < 270:    # ~ 13 cm
            return 250
        elif height < 320:    # ~ 15 cm
            return 330
        elif height < 400:    # ~ 19 cm
            return 500
        elif height < 450:    # ~ 21 cm
            return 600
        elif height < 470:    # ~ 22.5 cm
            return 1000
        else:                 # >= 470 pixels (fills the frame)
            return 1500