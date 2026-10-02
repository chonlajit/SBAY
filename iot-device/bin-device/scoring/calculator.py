import os
import json
import logging
import requests

from settings.config import (
    GRAM_PER_ML,
    PRICE_PER_KG,
    SCORE_PER_GRAM,
    K,
    API_BASE,
    PRICING_CACHE_FILE
)

logger = logging.getLogger("scoring")

class ScoreCalculator:
    """
    ScoreCalculator with Dynamic Pricing & Offline Resilient Caching.
    
    1. Fetches real-time price per kg and score per gram from the Web Admin via /api/devices/pricing.
    2. Automatically saves to local cache file (data/pricing_cache.json).
    3. When network is offline or internet disconnects, seamlessly reads from the local cache.
    4. Automatically updates whenever internet is reconnected or prices change.
    """

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

    # Class-level shared pricing cache across all instances
    _prices = dict(PRICE_PER_KG)
    _scores_per_gram = dict(SCORE_PER_GRAM)
    _source = "UNINITIALIZED"
    _last_sync_time = None
    _initialized = False

    def __init__(self, auto_sync=True):
        if not ScoreCalculator._initialized:
            ScoreCalculator._load_local_cache()
            if auto_sync:
                ScoreCalculator.sync_pricing(timeout=2.0)
            ScoreCalculator._initialized = True

    @classmethod
    def _load_local_cache(cls):
        """Loads cached pricing from PRICING_CACHE_FILE if it exists."""
        if os.path.exists(PRICING_CACHE_FILE):
            try:
                with open(PRICING_CACHE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "pricePerKg" in data and isinstance(data["pricePerKg"], dict):
                        cls._prices.update(data["pricePerKg"])
                    if "scorePerGram" in data and isinstance(data["scorePerGram"], dict):
                        cls._scores_per_gram.update(data["scorePerGram"])
                    cls._source = "LOCAL_CACHE"
                    logger.info(f"[ScoreCalculator] Loaded pricing from local cache: {cls._prices}")
                    return True
            except Exception as e:
                logger.warning(f"[ScoreCalculator] Failed to load local cache from {PRICING_CACHE_FILE}: {e}")
        cls._source = "DEFAULT_FALLBACK"
        return False

    @classmethod
    def _save_local_cache(cls, data):
        """Saves pricing data atomically to PRICING_CACHE_FILE."""
        try:
            os.makedirs(os.path.dirname(PRICING_CACHE_FILE), exist_ok=True)
            temp_file = PRICING_CACHE_FILE + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            if os.path.exists(PRICING_CACHE_FILE):
                os.replace(temp_file, PRICING_CACHE_FILE)
            else:
                os.rename(temp_file, PRICING_CACHE_FILE)
            logger.info(f"[ScoreCalculator] Saved updated pricing to local cache: {PRICING_CACHE_FILE}")
        except Exception as e:
            logger.warning(f"[ScoreCalculator] Failed to save local cache to {PRICING_CACHE_FILE}: {e}")

    @classmethod
    def sync_pricing(cls, api_base=None, timeout=2.0):
        """
        Attempts to fetch latest pricing from Backend API (/api/devices/pricing)
        and updates local cache file.
        Returns:
            bool: True if synced online, False if offline (using local cache or fallback).
        """
        base = (api_base or API_BASE).rstrip('/')
        url = f"{base}/devices/pricing"

        try:
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 200:
                payload = resp.json()
                if "pricePerKg" in payload and isinstance(payload["pricePerKg"], dict):
                    cls._prices.update(payload["pricePerKg"])
                if "scorePerGram" in payload and isinstance(payload["scorePerGram"], dict):
                    cls._scores_per_gram.update(payload["scorePerGram"])

                cls._source = "ONLINE_API"
                cls._last_sync_time = payload.get("timestamp")
                cls._save_local_cache(payload)
                logger.info(f"[ScoreCalculator] Synced pricing from {url}: {cls._prices}")
                return True
        except Exception as e:
            # Network offline or server unreachable
            logger.debug(f"[ScoreCalculator] Network sync failed ({e}), falling back to local cache.")

        # Fallback to local cache if not yet online
        cls._load_local_cache()
        return False

    def get_price_per_kg(self, canonical_label):
        """Returns price per kg for the specified waste type."""
        return float(ScoreCalculator._prices.get(canonical_label, PRICE_PER_KG.get(canonical_label, 10)))

    def get_score_per_gram(self, canonical_label):
        """Returns points given per gram for the specified waste type."""
        if canonical_label in ScoreCalculator._scores_per_gram:
            return float(ScoreCalculator._scores_per_gram[canonical_label])
        # Fallback: price / 1000 * K (where K=80 -> 80% * 100 points/baht)
        price = self.get_price_per_kg(canonical_label)
        return float((price / 1000.0) * K)

    def calculate(self, label, size_ml):
        clean_label = str(label).upper().strip()
        canonical_label = self.LABEL_ALIASES.get(clean_label, clean_label)

        gram_factor = GRAM_PER_ML.get(canonical_label, 0.033)
        price = self.get_price_per_kg(canonical_label)
        score_per_gram = self.get_score_per_gram(canonical_label)

        weight = size_ml * gram_factor
        score = weight * score_per_gram

        return {
            "weight": round(weight, 2),
            "score": round(score, 2),
            "price_per_kg": price,
            "score_per_gram": round(score_per_gram, 4)
        }

    @classmethod
    def get_pricing_status(cls):
        """Returns current pricing state and source."""
        return {
            "source": cls._source,
            "lastSyncTime": cls._last_sync_time,
            "prices": dict(cls._prices),
            "scoresPerGram": dict(cls._scores_per_gram)
        }
