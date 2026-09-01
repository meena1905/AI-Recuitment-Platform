from sentence_transformers import SentenceTransformer, util

_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def calculate_similarity(text_a: str, text_b: str) -> float:
    model = get_model()
    embedding_a = model.encode(text_a, convert_to_tensor=True)
    embedding_b = model.encode(text_b, convert_to_tensor=True)
    similarity = util.cos_sim(embedding_a, embedding_b)
    return round(similarity.item(), 3)