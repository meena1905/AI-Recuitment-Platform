from groq import Groq
from dotenv import load_dotenv
import os
import json

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

DEFAULT_MODEL = "openai/gpt-oss-120b"


def ask_candidate_rag(
    resume_text: str,
    candidate_name: str,
    candidate_meta: dict,
    job_title: str,
    job_description: str,
    job_requirements: str,
    question: str,
    history: list[dict] = None,
) -> dict:
    """
    Context-augmented Q&A over a candidate's resume grounded in the target job requirements.
    """
    history = history or []

    system_prompt = f"""You are an elite, highly objective Technical Recruitment and Talent Intelligence Assistant.
Your objective is to answer questions from HR hiring managers regarding a candidate based strictly on their resume and the target role requirements.

TARGET ROLE:
Title: {job_title}
Description: {job_description}
Requirements: {job_requirements}

CANDIDATE PROFILE:
Name: {candidate_name}
Match Score: {candidate_meta.get("match_score", "N/A")}%
Parsed Skills: {candidate_meta.get("skills", "[]")}
Experience Summary: {candidate_meta.get("experience", "N/A")}
Education Summary: {candidate_meta.get("education", "N/A")}

FULL EXTRACTED RESUME TEXT:
\"\"\"
{resume_text}
\"\"\"

STRICT OPERATIONAL GUIDELINES:
1. Truthfulness & Grounding: Base your assessment strictly on the provided resume text. Do NOT hallucinate skills, companies, or accomplishments not present in the resume.
2. Accuracy: If a specific tool, framework, or experience is NOT mentioned in the resume, explicitly declare: "The resume does not mention experience with [X]."
3. Contextual Relevance: Connect findings directly to the requirements of the {job_title} role.
4. Tone & Style: High-caliber, executive, concise, and easy to scan in a plain-text chat card. Use section titles on their own lines. Use numbered lists where helpful. Do not use Markdown syntax: no asterisks, hashes, hyphens as bullets, backticks, or tables. Do not use decorative emojis.
5. Provide 2-3 targeted follow-up questions that the recruiter might want to ask next or explore in an interview.

Respond with ONLY valid JSON formatted exactly as:
{{
  "answer": "<Plain-text structured answer with section titles such as Summary, Evidence from Resume, Strengths, and Risk Factors>",
  "suggested_followups": [
    "<Follow-up question 1>",
    "<Follow-up question 2>",
    "<Follow-up question 3>"
  ]
}}"""

    messages = [{"role": "system", "content": system_prompt}]

    for item in history[-6:]:
        role = "user" if item.get("role") == "user" else "assistant"
        content = item.get("content", "")
        if content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": question})

    try:
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=messages,
            temperature=0.2,
        )
        raw_output = response.choices[0].message.content
        try:
            return json.loads(raw_output)
        except json.JSONDecodeError:
            cleaned = raw_output.strip().strip("```json").strip("```").strip()
            return json.loads(cleaned)
    except Exception as exc:
        return {
            "answer": f"Unable to process query at this time. Details: {str(exc)}",
            "suggested_followups": [
                "Summarize candidate strengths and risks",
                "Generate technical interview questions",
                "Analyze project experience depth",
            ],
        }


def compare_candidates_rag(
    job_title: str,
    job_description: str,
    job_requirements: str,
    candidate_a: dict,
    candidate_b: dict,
) -> dict:
    """
    Performs a deep, comparative evaluation of two candidates against a target job role.
    """
    prompt = f"""You are a Principal Talent Acquisition Consultant conducting a comparative assessment of two candidates for a role.

TARGET ROLE:
Title: {job_title}
Description: {job_description}
Requirements: {job_requirements}

CANDIDATE A:
Name: {candidate_a.get("name", "Candidate A")}
Match Score: {candidate_a.get("match_score", "N/A")}%
Skills: {candidate_a.get("skills", "[]")}
Experience: {candidate_a.get("experience", "N/A")}
Education: {candidate_a.get("education", "N/A")}
Resume Excerpt:
\"\"\"
{candidate_a.get("resume_text", "")[:4000]}
\"\"\"

CANDIDATE B:
Name: {candidate_b.get("name", "Candidate B")}
Match Score: {candidate_b.get("match_score", "N/A")}%
Skills: {candidate_b.get("skills", "[]")}
Experience: {candidate_b.get("experience", "N/A")}
Education: {candidate_b.get("education", "N/A")}
Resume Excerpt:
\"\"\"
{candidate_b.get("resume_text", "")[:4000]}
\"\"\"

Produce a comprehensive, structured comparison adhering to strict industry standards (no emojis, professional objective tone).
Respond with ONLY valid JSON formatted as:
{{
  "executive_verdict": "<2-3 sentence strategic verdict on how the two candidates compare for this specific role>",
  "candidate_a": {{
    "name": "{candidate_a.get("name", "Candidate A")}",
    "score": {candidate_a.get("match_score", 0) or 0},
    "key_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "potential_risks": ["<risk or gap 1>", "<risk or gap 2>"],
    "ideal_for": "<1 sentence describing what role/context this candidate is best suited for>"
  }},
  "candidate_b": {{
    "name": "{candidate_b.get("name", "Candidate B")}",
    "score": {candidate_b.get("match_score", 0) or 0},
    "key_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "potential_risks": ["<risk or gap 1>", "<risk or gap 2>"],
    "ideal_for": "<1 sentence describing what role/context this candidate is best suited for>"
  }},
  "dimension_comparison": [
    {{
      "dimension": "Technical Skills & Stack Alignment",
      "candidate_a_eval": "<Brief evaluation of Candidate A>",
      "candidate_b_eval": "<Brief evaluation of Candidate B>",
      "leader": "<Name of Candidate A or Candidate B or Tie>"
    }},
    {{
      "dimension": "Relevant Industry Experience & Seniority",
      "candidate_a_eval": "<Brief evaluation of Candidate A>",
      "candidate_b_eval": "<Brief evaluation of Candidate B>",
      "leader": "<Name of Candidate A or Candidate B or Tie>"
    }},
    {{
      "dimension": "Education & Core Foundations",
      "candidate_a_eval": "<Brief evaluation of Candidate A>",
      "candidate_b_eval": "<Brief evaluation of Candidate B>",
      "leader": "<Name of Candidate A or Candidate B or Tie>"
    }}
  ],
  "final_recommendation": "<Clear, reasoned recommendation on who to prioritize for interviews and why>"
}}"""

    try:
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        raw_output = response.choices[0].message.content
        try:
            return json.loads(raw_output)
        except json.JSONDecodeError:
            cleaned = raw_output.strip().strip("```json").strip("```").strip()
            return json.loads(cleaned)
    except Exception as exc:
        return {
            "executive_verdict": f"Comparison service encountered an error: {str(exc)}",
            "candidate_a": {
                "name": candidate_a.get("name", "Candidate A"),
                "score": candidate_a.get("match_score", 0) or 0,
                "key_strengths": ["Data unavailable"],
                "potential_risks": ["Data unavailable"],
                "ideal_for": "Evaluation pending",
            },
            "candidate_b": {
                "name": candidate_b.get("name", "Candidate B"),
                "score": candidate_b.get("match_score", 0) or 0,
                "key_strengths": ["Data unavailable"],
                "potential_risks": ["Data unavailable"],
                "ideal_for": "Evaluation pending",
            },
            "dimension_comparison": [],
            "final_recommendation": "Please try again or inspect individual candidate scorecards.",
        }
