import sys
from pymongo import MongoClient

# Configuration
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "iotdb"

def main():
    print("="*50)
    print("   SBAY - RESET ENTIRE SYSTEM (DANGER ZONE)")
    print("="*50)
    
    print("WARNING: This will wipe ALL transactions, sessions, and redemptions.")
    print("WARNING: It will also reset ALL users' points and credits to 0.")
    print("Users and rewards will NOT be deleted.")
    
    confirm = input("\nAre you ABSOLUTELY sure you want to wipe the system? (type 'YES WIPE SYSTEM'): ").strip()
    if confirm != 'YES WIPE SYSTEM':
        print("Aborted.")
        return
        
    print("\nStarting system wipe...")
    
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        # 1. Reset all users' points and credits to 0
        user_result = db.users.update_many(
            {}, # match all users
            {"$set": {
                "points": 0,
                "activityCredits": 0,
                "volunteerHours": 0
            }}
        )
        print(f" - Reset points and credits for {user_result.modified_count} users.")
        
        # 2. Delete all transactions
        tx_result = db.transactions.delete_many({})
        print(f" - Deleted {tx_result.deleted_count} transactions.")
        
        # 3. Delete all device sessions
        session_result = db.device_sessions.delete_many({})
        print(f" - Deleted {session_result.deleted_count} device sessions.")
        
        # 4. Delete all redemptions
        redeem_result = db.redemptions.delete_many({})
        print(f" - Deleted {redeem_result.deleted_count} redemptions.")
        
        # 5. Reset global stats if any (Optional - normally calculated on the fly)
        # db.global_stats.delete_many({}) 
        
        print("\n✅ Success! The system has been completely wiped.")
        print("All users are now empty with 0 points. Please refresh your web application.")
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    main()
