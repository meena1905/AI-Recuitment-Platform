from groq import Groq
from dotenv import load_dotenv
import os
import json
load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def generate_rejection_feedback(
    resume_text: str,
    job_title: str,
    job_requirements: str,
    candidate_skills: str | None = None,
) -> str | None:
    """Create a brief, respectful improvement tip for a rejected candidate."""
    prompt = f"""Write exactly two concise, constructive sentences for a candidate who was not selected for the role below.

ROLE TITLE: {job_title}
ROLE REQUIREMENTS:
{job_requirements}

CANDIDATE SKILLS (if available):
{candidate_skills or "Not available"}

RESUME EXCERPT:
{resume_text[:6000] or "Not available"}

Rules:
- Base the feedback only on the role requirements and the candidate information provided.
- Suggest one or two relevant technical or professional areas to strengthen for future opportunities.
- Be encouraging and specific, without making promises or explaining the hiring decision.
- Never mention protected or personal characteristics, age, gender, nationality, disability, or school prestige.
- Do not use greetings, sign-offs, bullets, Markdown, or quotation marks.
"""
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        feedback = (response.choices[0].message.content or "").strip()
        return feedback or None
    except Exception as exc:
        print(f"Unable to generate rejection feedback: {exc}")
        return None

def score_resume_against_job(resume_text: str, job_description: str, job_requirements: str) -> dict:
    prompt = f"""You are a recruitment screening assistant. Compare the candidate's resume against the job description and requirements below.
JOB DESCRIPTION:
{job_description}
JOB REQUIREMENTS:
{job_requirements}
CANDIDATE RESUME:
{resume_text}
Respond with ONLY valid JSON, no other text, no markdown code blocks, in exactly this format:
{{
  "match_score": <integer 0-100>,
    "score_breakdown": {{"skills": <integer 0-100>, "experience": <integer 0-100>, "education": <integer 0-100>}},
    "candidate": {{"name": "", "email": "", "phone": "", "skills": [], "experience": "", "education": ""}},
  "matched_skills": [<list of skills from requirements that the candidate has>],
  "missing_skills": [<list of skills from requirements that the candidate lacks>],
  "explanation": "<2-3 sentence explanation of the match>"
}}"""
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    raw_output = response.choices[0].message.content
    try:
        result = json.loads(raw_output)
    except json.JSONDecodeError:
        cleaned = raw_output.strip().strip("```json").strip("```").strip()
        result = json.loads(cleaned)
    return result
