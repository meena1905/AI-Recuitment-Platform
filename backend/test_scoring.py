from ai_scorer import score_resume_against_job
resume_text = """
Kavya Reddy
Graphic Designer with 4 years of experience.
Skills:
- Photoshop, Illustrator, Figma
- UI/UX Design, Branding
Experience:
- Senior Designer at CreativeHub (2022-2026): Led branding projects for 10+ clients.
Education:
- Bachelor's degree in Design, NID Ahmedabad, 2022
"""
job_description = "We are looking for a Backend Developer to build and maintain our APIs."
job_requirements = "Python, FastAPI, SQL, REST API design, 2+ years experience"
print("\n--- Testing a GOOD match ---")
job_description_2 = "We are looking for a talented UI/UX Designer to craft user-centered digital experiences."
job_requirements_2 = "Figma, Photoshop, Illustrator, UI/UX design principles, branding experience"
result_2 = score_resume_against_job(resume_text, job_description_2, job_requirements_2)
print(result_2)
result = score_resume_against_job(resume_text, job_description, job_requirements)
print(result)
print(f"\nType of result: {type(result)}")
print(f"Match score: {result['match_score']}")