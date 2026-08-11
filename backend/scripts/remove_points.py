import sys
import datetime
from pymongo import MongoClient

# Configuration
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "iotdb"

def get_user_by_email(db, email):
    try:
        user = db.users.find_one({"email": email.strip().lower()})
        return user
    except Exception as e:
        print(f"Database error: {e}")
        return None

def main():
    print("="*50)
    print("   SBAY - Remove Points (Admin)")
    print("="*50)
    
    email = input("Enter user's email: ").strip()
    if not email:
        print("Email is required.")
        return
        
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    user = get_user_by_email(db, email)
    if not user:
        print(f"Error: User with email '{email}' not found in database.")
        return
        
    user_id = str(user["_id"])
    current_points = user.get("points", 0)
    print(f"Found user! (ID: {user_id})")
    print(f"Current Points: {current_points}")
    
    try:
        points_str = input("Enter points to REMOVE: ").strip()
        points_to_remove = int(float(points_str))
        if points_to_remove <= 0:
            print("Points to remove must be greater than 0.")
            return
    except ValueError:
        print("Invalid number.")
        return
        
    new_points = max(0, current_points - points_to_remove)
    print(f"\nRemoving {points_to_remove} points from {email} (New Balance: {new_points})...")
    
    try:
        # Update user points
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"points": new_points}}
        )
        
        # Add negative transaction for history
        db.transactions.insert_one({
            "userId": user_id,
            "wasteType": "ADMIN_REMOVE_POINTS",
            "pointsEarned": -points_to_remove,
            "timestamp": datetime.datetime.now(),
            "_class": "com.example.iotbackend.model.Transaction"
        })
        print("✅ Success! Points removed. (Note: Please refresh the web page to see updates).")
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    main()
