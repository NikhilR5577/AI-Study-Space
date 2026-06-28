import os 
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    WebBaseLoader,
    UnstructuredPowerPointLoader  # Added for slides
)
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import UPLOAD_DIR
import pytesseract
from PIL import Image

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

class SimpleImageLoader:
    """A lightweight custom loader that extracts text from images using OCR."""
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load(self):
        try:
            img = Image.open(self.file_path)
            extracted_text = pytesseract.image_to_string(img)
            return [Document(page_content=extracted_text, metadata={"source": self.file_path})]
        except Exception as e:
            raise RuntimeError(f"Failed to process image {self.file_path}: {str(e)}")


def get_file_path(filename: str):
    return os.path.join(UPLOAD_DIR, filename)

def get_loader(file_path: str):
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.pdf':
        return PyPDFLoader(file_path)
    elif ext in ['.docx', '.doc']:
        return Docx2txtLoader(file_path)
    elif ext in ['.pptx', '.ppt']:
        # Route PowerPoint presentations here
        return UnstructuredPowerPointLoader(file_path)
    elif ext in ['.png', '.jpg', '.jpeg']:
        return SimpleImageLoader(file_path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")
    
def load_and_split_document(file_path: str = None, url: str = None):
    """Loads a document from a file path OR a URL, then chunks it."""
    if url:
        loader = WebBaseLoader(url)
    elif file_path:
        loader = get_loader(file_path)
    else:
        raise ValueError("Must provide either a file_path or a url")
        
    pages = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_documents(pages)
    
    return pages, chunks