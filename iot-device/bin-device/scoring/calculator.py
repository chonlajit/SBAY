from settings.config import GRAM_PER_ML, PRICE_PER_KG, K

class ScoreCalculator:
    LABEL_ALIASES = {
        "CLEAR_BOTTLE": "PLASTIC_BOTTLE",
        "OPAQUE_BOTTLE": "PLASTIC_BOTTLE",
        "BOTTLE": "PLASTIC_BOTTLE",
        "PLASTIC": "PLASTIC_BOTTLE",
        "CAN": "ALUMINUM_CAN",
        "CANNED": "ALUMINUM_CAN",
        "CRAZYWOLF": "ALUMINUM_CAN",
        "HELL": "ALUMINUM_CAN",
        "CARTON": "BEVERAGE_CARTON",
        "MILK": "BEVERAGE_CARTON",
        "BA": "BEVERAGE_CARTON",
    }

    def calculate(self, label, size_ml):
        clean_label = str(label).upper().strip()
        canonical_label = self.LABEL_ALIASES.get(clean_label, clean_label)

        price = PRICE_PER_KG.get(canonical_label, 10)
        gram_factor = GRAM_PER_ML.get(canonical_label, 0.033)

        price_per_gram = price / 1000
        score_per_gram = price_per_gram * K

        weight = size_ml * gram_factor
        score = weight * score_per_gram

        return {
            "weight": round(weight, 2),
            "score": round(score, 2)
        }
