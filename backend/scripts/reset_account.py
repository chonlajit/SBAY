import sys
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
    print("   SBAY - RESET ACCOUNT (DANGER ZONE)")
    print("="*50)
    
    email = input("Enter user's email to RESET: ").strip()
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
    print(f"Found user! (ID: {user_id})")
    
    confirm = input(f"Are you sure you want to delete ALL data for {email}? (yes/no): ").strip().lower()
    if confirm not in ['yes', 'y']:
        print("Aborted.")
        return
        
    print(f"\nResetting account for {email}...")
    
    try:
        # 1. Reset user points and credits to 0
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "points": 0,
                "activityCredits": 0,
                "volunteerHours": 0
            }}
        )
        print(" - Reset points, activityCredits, and volunteerHours to 0.")
        
        # 2. Delete all transactions
        tx_result = db.transactions.delete_many({"userId": user_id})
        print(f" - Deleted {tx_result.deleted_count} transactions.")
        
        # 3. Delete all device sessions
        session_result = db.device_sessions.delete_many({"userId": user_id})
        print(f" - Deleted {session_result.deleted_count} device sessions.")
        
        # 4. Delete all redemptions
        redeem_result = db.redemptions.delete_many({"userId": user_id})
        print(f" - Deleted {redeem_result.deleted_count} redemptions.")
        
        print("\n✅ Success! Account is now completely clean like a new one.")
        print("Please log out and log back in, or refresh the page to see changes.")
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    main()
