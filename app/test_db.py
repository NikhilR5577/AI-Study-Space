import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

load_dotenv()
url = os.getenv("MONGODB_URL")

async def test_write():
    client = AsyncIOMotorClient(url)
    db = client["SecondBrainDB"] # Your database name from logs
    collection = db["chat_history"] # The collection your app uses
    
    try:
        print("DEBUG: Attempting to insert test document...")
        result = await collection.insert_one({"test_key": "success_test"})
        print(f"✅ SUCCESS: Data written! ID: {result.inserted_id}")
        
        # Cleanup
        await collection.delete_one({"_id": result.inserted_id})
        print("✅ Cleanup complete.")
    except Exception as e:
        print(f"❌ FAILED: Could not write to MongoDB.")
        print(f"Details: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_write())