import os 
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR  = "uploaded_files"
CHROMA_DB_DIR = "chroma_db"

os.makedirs(UPLOAD_DIR, exist_ok= True)
os.makedirs(CHROMA_DB_DIR, exist_ok=True)