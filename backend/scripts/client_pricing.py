import os
import json
import time
import requests

# Default server endpoint
DEFAULT_API_URL = "http://localhost:8070/api/devices/pricing"
CACHE_FILE = os.path.join(os.path.dirname(__file__), "pricing_cache.json")

# Built-in fallback in case network is down and cache file does not yet exist
FALLBACK_PRICING = {
    "version": 1,
    "source": "HARDCODED_FALLBACK",
    "updatedAt": "2026-10-01T00:00:00",
    "userPointRate": 0.80,
    "scorePerGram": {
        "PLASTIC_BOTTLE": 0.8,
        "ALUMINUM_CAN": 3.2,
        "BEVERAGE_CARTON": 0.72
    },
    "pricePerKg": {
        "PLASTIC_BOTTLE": 10.0,
        "ALUMINUM_CAN": 40.0,
        "BEVERAGE_CARTON": 9.0
    },
    "pointsPerKg": {
        "PLASTIC_BOTTLE": 800.0,
        "ALUMINUM_CAN": 3200.0,
        "BEVERAGE_CARTON": 720.0
    }
}

class PricingClient:
    """
    Offline-resilient pricing client for Smart Bin IoT devices.
    
    1. Fetches current pricing (price per kg and score per gram) from SBAY backend.
    2. Automatically saves to local cache file (pricing_cache.json).
    3. When network is offline / disconnects, seamlessly reads from the saved local cache.
    4. Automatically updates whenever internet is reconnected or prices change.
    """

    def __init__(self, api_url=DEFAULT_API_URL, cache_file=CACHE_FILE):
        self.api_url = api_url
        self.cache_file = cache_file
        self.data = self._load_cache()

    def _load_cache(self):
        """Loads cached pricing from local disk, or returns default fallback."""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                    cached["source"] = "LOCAL_CACHE"
                    return cached
            except Exception as e:
                print(f"[PricingClient] Warning: Failed to read {self.cache_file}: {e}")
        return dict(FALLBACK_PRICING)

    def _save_cache(self, data):
        """Atomically saves pricing data to local disk."""
        try:
            temp_file = self.cache_file + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            if os.path.exists(self.cache_file):
                os.replace(temp_file, self.cache_file)
            else:
                os.rename(temp_file, self.cache_file)
        except Exception as e:
            print(f"[PricingClient] Warning: Failed to write {self.cache_file}: {e}")

    def sync(self, timeout=3.0):
        """
        Attempts to fetch latest pricing from server and update local cache.
        Returns:
            bool: True if synced from server, False if using offline cache.
        """
        try:
            resp = requests.get(self.api_url, timeout=timeout)
            if resp.status_code == 200:
                payload = resp.json()
                payload["source"] = "ONLINE_SERVER"
                payload["lastSyncTime"] = time.strftime("%Y-%m-%dT%H:%M:%S")
                self.data = payload
                self._save_cache(payload)
                return True
        except Exception as e:
            # Server unreachable or offline
            pass

        # Offline fallback: ensure we have local data loaded
        if self.data.get("source") != "LOCAL_CACHE":
            self.data = self._load_cache()
        return False

    def get_score_per_gram(self, item_type):
        """Returns points given per gram for the specified waste type."""
        scores = self.data.get("scorePerGram", {})
        return float(scores.get(item_type, FALLBACK_PRICING["scorePerGram"].get(item_type, 0.8)))

    def get_price_per_kg(self, item_type):
        """Returns market price per kg (Baht) for the specified waste type."""
        prices = self.data.get("pricePerKg", {})
        return float(prices.get(item_type, FALLBACK_PRICING["pricePerKg"].get(item_type, 10.0)))

    def get_points_per_kg(self, item_type):
        """Returns user points per kg for the specified waste type."""
        pts = self.data.get("pointsPerKg", {})
        if item_type in pts:
            return float(pts[item_type])
        return self.get_score_per_gram(item_type) * 1000.0

    def calculate_score(self, item_type, weight_grams):
        """Calculates points earned based on item type and weight in grams."""
        rate = self.get_score_per_gram(item_type)
        return round(float(weight_grams) * rate, 2)

    def print_status(self):
        """Prints formatted pricing status."""
        source = self.data.get("source", "UNKNOWN")
        print("\n" + "="*55)
        print(f"   SBAY - Recyclable Waste Pricing ({source})")
        print("="*55)
        print(f"Timestamp: {self.data.get('timestamp') or self.data.get('updatedAt')}")
        print(f"User Rate: 80% (System Profit: 20%) | 100 Points = 1 Baht\n")
        print(f"{'Waste Type':<18} | {'Price/kg':<10} | {'User Pts/kg':<12} | {'Pts/gram'}")
        print("-" * 55)
        for t in ["PLASTIC_BOTTLE", "ALUMINUM_CAN", "BEVERAGE_CARTON"]:
            pkg = self.get_price_per_kg(t)
            ptskg = self.get_points_per_kg(t)
            spg = self.get_score_per_gram(t)
            print(f"{t:<18} | THB {pkg:<5.2f} | {ptskg:<12.1f} | {spg:.4f}")
        print("="*55 + "\n")

# Global singleton client instance
client = PricingClient()

if __name__ == "__main__":
    print("Testing PricingClient sync...")
    synced = client.sync()
    if synced:
        print(">> Synced successfully from backend API!")
    else:
        print(">> Network unavailable or offline. Using local cached pricing.")
    client.print_status()
