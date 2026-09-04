from pathlib import Path

import pdfplumber
from docx import Document

def normalize_extracted_text(text: str) -> str:
    return (
        text.replace("(cid:127)", "\n- ")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
    )

def extract_text_from_file(file_path: str) -> str:
    if Path(file_path).suffix.lower() == ".docx":
        document = Document(file_path)
        return normalize_extracted_text("\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()))

    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return normalize_extracted_text(text)

def extract_text_from_pdf(file_path: str) -> str:
    return extract_text_from_file(file_path)