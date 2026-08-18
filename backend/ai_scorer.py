from groq import Groq
from dotenv import load_dotenv
import os
import json

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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