class SizeEstimator:

    def get_size_ml(self, height):
        if height < 80:
            return 150
        elif height < 100:
            return 200
        elif height < 120:
            return 220
        elif height < 140:
            return 250
        elif height < 170:
            return 300
        elif height < 210:
            return 500
        elif height < 240:
            return 600
        elif height < 270:
            return 750
        elif height < 320:
            return 1000
        else:
            return 1500