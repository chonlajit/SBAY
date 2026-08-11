import sys
import requests
import datetime
import random
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# Configuration
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "iotdb"
API_URL = "http://localhost:8070/api/sessions"
MACHINE_ID = "BIN-001"

SCORE_PER_GRAM = {
    "PLASTIC_BOTTLE": 0.8,
    "ALUMINUM_CAN": 3.2,
    "BEVERAGE_CARTON": 0.72
}
GRAM_PER_ML = {
    "PLASTIC_BOTTLE": 0.033,
    "ALUMINUM_CAN": 0.033,
    "BEVERAGE_CARTON": 0.05
}

def get_user_id_by_email(email):
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        user = db.users.find_one({"email": email.strip().lower()})
        if user:
            return str(user["_id"])
        return None
    except Exception as e:
        print(f"Database error: {e}")
        return None

def main():
    print("="*50)
    print("   SBAY - Add Points to User Account (Simulate)")
    print("="*50)
    
    email = input("Enter user's email: ").strip()
    if not email:
        print("Email is required.")
        return
        
    user_id = get_user_id_by_email(email)
    
    if not user_id:
        print(f"Error: User with email '{email}' not found in database.")
        return
        
    print(f"Found user! (ID: {user_id})")
    
    try:
        points_str = input("Enter points to add: ").strip()
        points = float(points_str)
        if points <= 0:
            print("Points must be greater than 0.")
            return
    except ValueError:
        print("Invalid number.")
        return
        
    print(f"\nAdding {points} points to {email}...")
    
    # --- Approximation Calculation ---
    # We will pick standard realistic sizes and mix them until we reach close to the target points.
    items = []
    accumulated_score = 0
    accumulated_ml = 0
    
    standard_sizes = [250, 330, 500, 600, 1000, 1500]
    
    while accumulated_score < points:
        item_type = random.choice(["PLASTIC_BOTTLE", "ALUMINUM_CAN", "BEVERAGE_CARTON"])
        size_ml = random.choice(standard_sizes)
        
        weight_g = round(size_ml * GRAM_PER_ML[item_type], 2)
        score = round(weight_g * SCORE_PER_GRAM[item_type], 2)
        
        items.append({
            "type": item_type,
            "ml": size_ml,
            "weight": weight_g,
            "score": score,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        accumulated_score += score
        accumulated_ml += size_ml
        
        # If we are reasonably close or exceeded, stop.
        if accumulated_score >= points:
            break
            
    # Create a mock session to inject the points properly 
    # so that it records in transactions and sends WebSocket updates
    payload = {
        "deviceId": MACHINE_ID,
        "userId": user_id, 
        "startTime": (datetime.datetime.now() - datetime.timedelta(seconds=10)).isoformat(),
        "items": items,
        "totalItems": len(items),
        "totalMl": round(accumulated_ml, 2),
        "totalScore": round(accumulated_score, 2)
    }

    try:
        response = requests.post(API_URL, json=payload, timeout=5)
        if response.status_code == 200:
            print("✅ Success! Points added and frontend should update automatically.")
        else:
            print(f"❌ Failed: HTTP {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Request error: {e}")

if __name__ == "__main__":
    main()
