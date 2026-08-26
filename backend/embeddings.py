from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("all-MiniLM-L6-v2")

def calculate_similarity(text_a: str, text_b: str) -> float:
    embedding_a = model.encode(text_a, convert_to_tensor=True)
    embedding_b = model.encode(text_b, convert_to_tensor=True)
    similarity = util.cos_sim(embedding_a, embedding_b)
    return round(similarity.item(), 3)