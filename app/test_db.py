import os
from dotenv import load_dotenv

load_dotenv() # Force load .env
token = os.getenv("HUGGINGFACEHUB_API_TOKEN")

print(f"Token loaded: {token}")
print(f"Token length: {len(token) if token else 0}")