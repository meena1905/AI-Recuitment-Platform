from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("all-MiniLM-L6-v2")

resume_text = "Experienced graphic designer skilled in Figma, Photoshop, and UI/UX design principles."
job_text_match = "Looking for a UI/UX designer with strong Figma and design skills."
job_text_mismatch = "Looking for a backend developer with Python and SQL experience."

resume_embedding = model.encode(resume_text, convert_to_tensor=True)
job_match_embedding = model.encode(job_text_match, convert_to_tensor=True)
job_mismatch_embedding = model.encode(job_text_mismatch, convert_to_tensor=True)

similarity_match = util.cos_sim(resume_embedding, job_match_embedding)
similarity_mismatch = util.cos_sim(resume_embedding, job_mismatch_embedding)

print(f"Similarity to matching job: {similarity_match.item():.3f}")
print(f"Similarity to mismatched job: {similarity_mismatch.item():.3f}")