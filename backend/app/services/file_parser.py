import io
import pypdf
import pytesseract
from PIL import Image

def parse_file_to_text(file_bytes: bytes, filename: str) -> str:
    """
    Takes raw file bytes and a filename, and returns extracted text.
    Handles images (OCR), PDFs, and raw code/text files.
    """
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    # 1. Handle Images (OCR)
    if ext in ["png", "jpg", "jpeg", "webp", "bmp"]:
        try:
            image = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(image)
            return f"--- IMAGE CONTENT ({filename}) ---\n{text.strip()}\n"
        except Exception as e:
            return f"[Error processing image {filename}: {str(e)}]"
            
    # 2. Handle PDF
    if ext == "pdf":
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return f"--- PDF CONTENT ({filename}) ---\n{text.strip()}\n"
        except Exception as e:
            return f"[Error processing PDF {filename}: {str(e)}]"
            
    # 3. Default: Assume Text/Code
    try:
        # Try to decode as utf-8 (works for .c, .cpp, .java, .js, .py, .txt, etc.)
        text = file_bytes.decode("utf-8")
        return f"--- FILE CONTENT ({filename}) ---\n{text.strip()}\n"
    except UnicodeDecodeError:
        return f"[Error: Unsupported binary file format for {filename}]"
