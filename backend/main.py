from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import pytesseract
import shutil
import os
import re
import cv2
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

#  CORS CONFIG
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Upload folder
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

#  Tesseract path (Windows)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

#  Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=5)


#  Health check
@app.get("/")
def home():
    return {"message": "Backend is working"}


#  OCR FUNCTION
def extract_text(file_path):
    img = cv2.imread(file_path)
    if img is None:
        return ""

    h, w = img.shape[:2]

    # Crop left half
    img = img[:, :w // 2]

    # Resize for better OCR
    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    # Preprocessing
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)

    thresh = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        2
    )

    custom_config = r'--oem 3 --psm 6'

    text = pytesseract.image_to_string(thresh, config=custom_config)
    return text


#  CLEAN NAME
def clean_name(name):
    if name:
        return name.replace("Sal", "Sai")
    return name


#  NAME
def extract_name(text):
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Case 1: After "To"
    for i, line in enumerate(lines):
        if line.lower() == "to" and i + 1 < len(lines):
            candidate = lines[i + 1]
            if len(candidate.split()) >= 2 and not any(char.isdigit() for char in candidate):
                return clean_name(candidate)

    # Case 2: First valid name line
    for line in lines:
        if (
            len(line.split()) >= 2 and
            not any(char.isdigit() for char in line) and
            "government" not in line.lower()
        ):
            return clean_name(line)

    return None


#  DOB
def extract_dob(text):
    patterns = [
        r"\b\d{2}/\d{2}/\d{4}\b",
        r"\b\d{2}-\d{2}-\d{4}\b",
        r"\b\d{2}\d{2}/\d{4}\b"
    ]

    for p in patterns:
        match = re.search(p, text)
        if match:
            return match.group()

    return None


#  AADHAAR NUMBER
def extract_aadhaar(text):
    matches = re.findall(r"\b\d{4}\s\d{4}\s\d{4}\b", text)

    for m in matches:
        if "VID" in text:
            continue
        return m

    return None


#  ADDRESS
def extract_address(text):
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    address = []
    capture = False

    for line in lines:
        if any(k in line for k in ["C/O", "S/O", "D/O", "Address", "To"]):
            capture = True

        if capture:
            address.append(line)

        if "PIN" in line:
            break

    return " ".join(address) if address else None


#  STRUCTURED DATA
def process_file(file_path):
    text = extract_text(file_path)

    structured = {
        "name": extract_name(text),
        "dob": extract_dob(text),
        "address": extract_address(text),
        "id_number": extract_aadhaar(text),
        "document_type": "aadhaar"
    }

    return {
        "filename": os.path.basename(file_path),
        "structured_data": structured,
        "raw_text": text
    }


#  MULTI-FILE API
@app.post("/upload-multiple")
async def upload_multiple(files: List[UploadFile] = File(...)):
    try:
        file_paths = []

        #  Save files
        for file in files:
            path = os.path.join(UPLOAD_DIR, file.filename)

            with open(path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            file_paths.append(path)

        #  Parallel processing
        results = list(executor.map(process_file, file_paths))

        return {
            "total_files": len(results),
            "documents": results
        }

    except Exception as e:
        return {"error": str(e)}