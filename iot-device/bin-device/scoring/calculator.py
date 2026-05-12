from config import GRAM_PER_ML, PRICE_PER_KG, K

class ScoreCalculator:

    def calculate(self, label, size_ml):
        price_per_gram = PRICE_PER_KG[label] / 1000
        score_per_gram = price_per_gram * K

        weight = size_ml * GRAM_PER_ML[label]
        score = weight * score_per_gram

        return {
            "weight": round(weight, 2),
            "score": round(score, 2)
        }