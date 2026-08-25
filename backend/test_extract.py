import pdfplumber
def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text
if __name__ == "__main__":
    resume_path = "uploads/ed16deb1-d744-4d25-9019-e122dd7b0291.pdf"  # your Day 8 test resume
    result = extract_text_from_pdf(resume_path)
    print("--- EXTRACTED TEXT ---")
    print(result)
    print("--- END ---")
    print(f"Total characters extracted: {len(result)}")