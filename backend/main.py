from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, inspect, text
from fastapi import UploadFile, File
import os
import os

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
try:
    from embeddings import calculate_similarity
    EMBEDDINGS_AVAILABLE = True
except Exception:
    EMBEDDINGS_AVAILABLE = False
import uuid
import csv
import io
from ai_scorer import score_resume_against_job
from pydantic import BaseModel
from database import Base, SessionLocal, engine
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks
from models import User
from notifications import send_status_email, send_interview_email, send_interview_slots_email
from resume_parser import extract_text_from_file
from auth import hash_password, verify_password, create_access_token, decode_access_token
from models import User, Company, Job, Application,Interview
import redis
import json as json_lib
from calendar_integration import create_interview_event
from prometheus_fastapi_instrumentator import Instrumentator

try:
    redis_client = redis.Redis(host="redis", port=6379, decode_responses=True, socket_connect_timeout=1)
    redis_client.ping()
    REDIS_AVAILABLE = True
except Exception:
    redis_client = None
    REDIS_AVAILABLE = False
app = FastAPI()
Instrumentator().instrument(app).expose(app)

with engine.begin() as connection:
    if "calendar_link" not in {column["name"] for column in inspect(engine).get_columns("interviews")}:
        connection.execute(text("ALTER TABLE interviews ADD COLUMN calendar_link VARCHAR"))
    application_columns = {column["name"] for column in inspect(engine).get_columns("applications")}
    for column_name, column_type in {
        "candidate_name": "VARCHAR",
        "candidate_email": "VARCHAR",
        "phone": "VARCHAR",
        "skills": "TEXT",
        "experience": "TEXT",
        "education": "TEXT",
        "skills_score": "FLOAT",
        "experience_score": "FLOAT",
        "education_score": "FLOAT",
    }.items():
        if column_name not in application_columns:
            connection.execute(text(f"ALTER TABLE applications ADD COLUMN {column_name} {column_type}"))
    Base.metadata.create_all(bind=engine)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
security = HTTPBearer()
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
        return current_user
    return role_checker
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  
    company_name: str | None = None  
class LoginRequest(BaseModel):
    email: str
    password: str
class JobCreate(BaseModel):
    title: str
    description: str
    requirements: str
class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    requirements: str | None = None
    status: str | None = None
class ApplicationStatusUpdate(BaseModel):
    status: str
class InterviewSchedule(BaseModel):
    scheduled_at: str
class InterviewSlots(BaseModel):
    scheduled_at: list[str]
class FeedbackUpdate(BaseModel):
    feedback: str
@app.get("/")
def read_root():
    return {"message": "Backend is alive"}
@app.post("/auth/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    company_id = None
    if payload.role == "hr":
        if not payload.company_name:
            raise HTTPException(status_code=400, detail="HR accounts must provide a company_name")
        company = db.query(Company).filter(Company.name == payload.company_name).first()
        if not company:
            company = Company(name=payload.company_name)
            db.add(company)
            db.commit()
            db.refresh(company)
        company_id = company.id
    new_user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        company_id=company_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "name": new_user.name, "email": new_user.email, "role": new_user.role, "company_id": new_user.company_id}
@app.post("/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({
        "user_id": user.id,
        "role": user.role,
        "company_id": user.company_id,
    })
    return {"access_token": token, "token_type": "bearer"}
@app.get("/me")
def read_current_user(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "company_id": current_user.company_id,
    }
@app.get("/hr-only")
def hr_only_route(current_user: User = Depends(require_role(["hr", "admin"]))):
    return {"message": f"Welcome HR user {current_user.name}"}
@app.post("/jobs")
def create_job(payload: JobCreate, current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    new_job = Job(
        company_id=current_user.company_id,
        title=payload.title,
        description=payload.description,
        requirements=payload.requirements,
        status="draft",
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job
@app.get("/jobs/mine")
def list_my_jobs(current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.company_id == current_user.company_id).all()
    return jobs
@app.put("/jobs/{job_id}")
def update_job(job_id: int, payload: JobUpdate, current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this job")
    if payload.title is not None:
        job.title = payload.title
    if payload.description is not None:
        job.description = payload.description
    if payload.requirements is not None:
        job.requirements = payload.requirements
    if payload.status is not None:
        job.status = payload.status
    db.commit()
    db.refresh(job)
    return job
@app.post("/jobs/{job_id}/description-file")
async def upload_job_description_file(
    job_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["hr"])),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this job")
    filename = file.filename or "job-description.pdf"
    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Job description must be a PDF or DOCX file")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    extension = os.path.splitext(filename)[1].lower()
    file_path = os.path.join(UPLOAD_DIR, f"job-description-{uuid.uuid4()}{extension}")
    with open(file_path, "wb") as output:
        output.write(contents)
    job.description = extract_text_from_file(file_path)
    db.commit()
    db.refresh(job)
    return {"job_id": job.id, "description": job.description}
@app.get("/jobs/public")
def list_public_jobs(db: Session = Depends(get_db)):
    if REDIS_AVAILABLE:
        cached = redis_client.get("public_jobs")
        if cached:
            return json_lib.loads(cached)

    jobs = db.query(Job).filter(Job.status == "published").all()
    result = [{"id": j.id, "title": j.title, "description": j.description, "requirements": j.requirements, "status": j.status, "company_id": j.company_id, "created_at": j.created_at.isoformat()} for j in jobs]

    if REDIS_AVAILABLE:
        redis_client.setex("public_jobs", 60, json_lib.dumps(result))

    return result
def run_scoring_task(application_id: int):
    db = SessionLocal()
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return

        job = db.query(Job).filter(Job.id == application.job_id).first()
        resume_text = extract_text_from_file(application.resume_url)

        if EMBEDDINGS_AVAILABLE:
           job_text = f"{job.description} {job.requirements}"
           embedding_similarity = calculate_similarity(resume_text, job_text)
           print(f"Embedding similarity for application {application_id}: {embedding_similarity}")

        result = score_resume_against_job(resume_text, job.description, job.requirements)

        application.match_score = result["match_score"]
        application.ai_explanation = result["explanation"]
        candidate = result.get("candidate", {})
        application.candidate_name = candidate.get("name") or None
        application.candidate_email = candidate.get("email") or None
        application.phone = candidate.get("phone") or None
        application.skills = json_lib.dumps(candidate.get("skills", []))
        application.experience = candidate.get("experience") or None
        application.education = candidate.get("education") or None
        breakdown = result.get("score_breakdown", {})
        application.skills_score = breakdown.get("skills")
        application.experience_score = breakdown.get("experience")
        application.education_score = breakdown.get("education")
        db.commit()
    except Exception as e:
        print(f"Scoring failed for application {application_id}: {e}")
    finally:
        db.close()
@app.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    resume: UploadFile = File(...),
    current_user: User = Depends(require_role(["candidate"])),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    existing = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already applied to this job")
    if not resume.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")
    contents = await resume.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    extension = os.path.splitext(resume.filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(contents)
    new_application = Application(
        job_id=job_id,
        candidate_id=current_user.id,
        resume_url=file_path,
        status="applied",
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)
    background_tasks.add_task(run_scoring_task, new_application.id)
    return new_application
@app.post("/jobs/{job_id}/bulk-resumes")
async def bulk_upload_resumes(
    job_id: int,
    background_tasks: BackgroundTasks,
    resumes: list[UploadFile] = File(...),
    current_user: User = Depends(require_role(["hr"])),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this job")
    if len(resumes) > 50:
        raise HTTPException(status_code=400, detail="You can upload up to 50 resumes at once")

    created_ids = []
    skipped_files = []
    for resume in resumes:
        filename = resume.filename or "resume.pdf"
        if not filename.lower().endswith((".pdf", ".docx")):
            skipped_files.append(filename)
            continue
        contents = await resume.read()
        if len(contents) > 5 * 1024 * 1024:
            skipped_files.append(filename)
            continue

        extension = os.path.splitext(filename)[1].lower()
        file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{extension}")
        with open(file_path, "wb") as output:
            output.write(contents)

        imported_candidate = User(
            name=os.path.splitext(filename)[0],
            email=f"imported-{uuid.uuid4()}@local.invalid",
            password_hash=hash_password(uuid.uuid4().hex),
            role="candidate",
        )
        db.add(imported_candidate)
        db.flush()
        application = Application(
            job_id=job_id,
            candidate_id=imported_candidate.id,
            resume_url=file_path,
            status="applied",
        )
        db.add(application)
        db.flush()
        created_ids.append(application.id)

    db.commit()
    for application_id in created_ids:
        background_tasks.add_task(run_scoring_task, application_id)
    return {"created_count": len(created_ids), "skipped_files": skipped_files}
@app.get("/applications/mine")
def list_my_applications(current_user: User = Depends(require_role(["candidate"])), db: Session = Depends(get_db)):
    applications = db.query(Application).filter(Application.candidate_id == current_user.id).all()
    result = []
    for application in applications:
        job = db.query(Job).filter(Job.id == application.job_id).first()
        interviews = db.query(Interview).filter(Interview.application_id == application.id).all()
        result.append({
            "id": application.id,
            "job_title": job.title if job else "Job application",
            "status": application.status,
            "match_score": application.match_score,
            "applied_at": application.applied_at,
            "interview": next((interview for interview in interviews if interview.status == "scheduled"), None),
            "interview_slots": [interview for interview in interviews if interview.status == "proposed"],
        })
    return result
@app.get("/jobs/{job_id}/applicants")
def list_applicants(
    job_id: int,
    min_score: float | None = Query(None, ge=0, le=100),
    status: str | None = None,
    skill: str | None = None,
    sort: str = "desc",
    current_user: User = Depends(require_role(["hr"])),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this job")
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    if min_score is not None:
        applications = [application for application in applications if (application.match_score or 0) >= min_score]
    if status:
        applications = [application for application in applications if application.status == status]
    if skill:
        search = skill.lower()
        applications = [
            application for application in applications
            if search in (application.skills or "").lower()
            or search in (application.candidate_name or "").lower()
        ]
    applications.sort(
        key=lambda application: application.match_score if application.match_score is not None else -1,
        reverse=sort != "asc",
    )
    result = []
    for application in applications:
        application_data = {
            column.name: getattr(application, column.name)
            for column in Application.__table__.columns
        }
        interview = (db.query(Interview)
            .filter(
                Interview.application_id == application.id,
                Interview.status == "scheduled",
            )
            .order_by(Interview.id.desc())
            .first()
        )
        if not interview:
            interview = (db.query(Interview)
                .filter(Interview.application_id == application.id)
                .order_by(Interview.id.desc())
                .first()
            )
        application_data["interview"] = {
            "id": interview.id,
            "scheduled_at": interview.scheduled_at,
            "calendar_link": interview.calendar_link,
            "status": interview.status,
        } if interview else None
        application_data["calendar_link"] = interview.calendar_link if interview else None
        result.append(application_data)
    return result
@app.get("/jobs/{job_id}/applicants/export")
def export_applicants(job_id: int, current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this job")
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application ID", "Candidate", "Email", "Phone", "Skills", "Experience",
        "Education", "Match Score", "Skills Score", "Experience Score",
        "Education Score", "Status", "AI Explanation",
    ])
    for application in applications:
        writer.writerow([
            application.id, application.candidate_name, application.candidate_email,
            application.phone, application.skills, application.experience,
            application.education, application.match_score, application.skills_score,
            application.experience_score, application.education_score,
            application.status, application.ai_explanation,
        ])
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=job-{job_id}-applicants.csv"},
    )
@app.get("/applications/{application_id}/resume-text")
def get_resume_text(application_id: int, current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this application")
    text = extract_text_from_file(application.resume_url)
    return {"application_id": application_id, "extracted_text": text}
@app.get("/applications/{application_id}/resume")
def get_resume(application_id: int, current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this application")
    if not application.resume_url or not os.path.isfile(application.resume_url):
        raise HTTPException(status_code=404, detail="Resume file not found")
    return FileResponse(
        application.resume_url,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if application.resume_url.lower().endswith(".docx") else "application/pdf",
        filename=f"candidate-{application.candidate_id}{os.path.splitext(application.resume_url)[1]}"
    )
@app.post("/applications/{application_id}/score")
def score_application(application_id: int, current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this application")
    resume_text = extract_text_from_file(application.resume_url)
    result = score_resume_against_job(resume_text, job.description, job.requirements)
    application.match_score = result["match_score"]
    application.ai_explanation = result["explanation"]
    candidate = result.get("candidate", {})
    application.candidate_name = candidate.get("name") or None
    application.candidate_email = candidate.get("email") or None
    application.phone = candidate.get("phone") or None
    application.skills = json_lib.dumps(candidate.get("skills", []))
    application.experience = candidate.get("experience") or None
    application.education = candidate.get("education") or None
    breakdown = result.get("score_breakdown", {})
    application.skills_score = breakdown.get("skills")
    application.experience_score = breakdown.get("experience")
    application.education_score = breakdown.get("education")
    db.commit()
    db.refresh(application)
    return application
@app.post("/applications/{application_id}/interview-link")
def create_missing_interview_link(
    application_id: int,
    current_user: User = Depends(require_role(["hr"])),
    db: Session = Depends(get_db),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this application")
    interview = db.query(Interview).filter(
        Interview.application_id == application_id,
        Interview.status == "scheduled",
    ).order_by(Interview.id.desc()).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Scheduled interview not found")
    if interview.calendar_link:
        return interview
    candidate = db.query(User).filter(User.id == application.candidate_id).first()
    try:
        interview.calendar_link = create_interview_event(candidate.email, job.title, interview.scheduled_at)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google Calendar event creation failed: {e}") from e
    db.commit()
    db.refresh(interview)
    send_interview_email(candidate.email, candidate.name, job.title, interview.scheduled_at, interview.calendar_link)
    send_interview_email(current_user.email, current_user.name, job.title, interview.scheduled_at, interview.calendar_link)
    return interview
VALID_STATUS_TRANSITIONS = {
    "applied": ["shortlisted", "rejected"],
    "shortlisted": ["interview_scheduled", "rejected"],
    "interview_scheduled": ["hired", "rejected"],
}
@app.put("/applications/{application_id}/status")
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    current_user: User = Depends(require_role(["hr"])),
    db: Session = Depends(get_db),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this application")
    allowed_next = VALID_STATUS_TRANSITIONS.get(application.status, [])
    if payload.status not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move from '{application.status}' to '{payload.status}'"
        )
    application.status = payload.status
    db.commit()
    db.refresh(application)
    candidate = db.query(User).filter(User.id == application.candidate_id).first()
    send_status_email(candidate.email, candidate.name, job.title, payload.status)
    return application
@app.post("/applications/{application_id}/interview")
def schedule_interview(
    application_id: int,
    payload: InterviewSchedule,
    current_user: User = Depends(require_role(["hr"])),
    db: Session = Depends(get_db),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this application")
    if application.status != "shortlisted":
        raise HTTPException(status_code=400, detail="Can only schedule interviews for shortlisted candidates")
    candidate = db.query(User).filter(User.id == application.candidate_id).first()
    try:
        calendar_link = create_interview_event(candidate.email, job.title, payload.scheduled_at)
        print(f"Calendar event created: {calendar_link}")
    except Exception as e:
        print(f"Calendar event creation failed: {e}")
        raise HTTPException(status_code=502, detail=f"Google Calendar authorization failed: {e}") from e

    new_interview = Interview(
        application_id=application_id,
        scheduled_at=payload.scheduled_at,
        calendar_link=calendar_link,
        status="scheduled",
    )
    db.add(new_interview)
    application.status = "interview_scheduled"
    db.commit()
    db.refresh(new_interview)
    send_interview_email(
        candidate.email,
        candidate.name,
        job.title,
        payload.scheduled_at,
        calendar_link,
    )
    send_interview_email(
        current_user.email,
        current_user.name,
        job.title,
        payload.scheduled_at,
        calendar_link,
    )

    return new_interview

@app.post("/applications/{application_id}/interview-slots")
def propose_interview_slots(
    application_id: int,
    payload: InterviewSlots,
    current_user: User = Depends(require_role(["hr"])),
    db: Session = Depends(get_db),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this application")
    if application.status != "shortlisted":
        raise HTTPException(status_code=400, detail="Only shortlisted candidates can be offered interview slots")
    slot_times = list(dict.fromkeys(payload.scheduled_at))
    if not slot_times or len(slot_times) > 5:
        raise HTTPException(status_code=400, detail="Provide between 1 and 5 interview slots")
    db.query(Interview).filter(
        Interview.application_id == application_id,
        Interview.status == "proposed",
    ).update({"status": "cancelled"})
    slots = [Interview(application_id=application_id, scheduled_at=slot, status="proposed") for slot in slot_times]
    db.add_all(slots)
    db.commit()
    candidate = db.query(User).filter(User.id == application.candidate_id).first()
    send_interview_slots_email(candidate.email, candidate.name, job.title, slot_times)
    return slots

@app.post("/interview-slots/{slot_id}/select")
def select_interview_slot(
    slot_id: int,
    current_user: User = Depends(require_role(["candidate"])),
    db: Session = Depends(get_db),
):
    selected_slot = db.query(Interview).filter(Interview.id == slot_id, Interview.status == "proposed").first()
    if not selected_slot:
        raise HTTPException(status_code=404, detail="Interview slot is no longer available")
    application = db.query(Application).filter(Application.id == selected_slot.application_id).first()
    if application.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this interview slot")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    try:
        calendar_link = create_interview_event(current_user.email, job.title, selected_slot.scheduled_at)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google Calendar event creation failed: {e}") from e
    selected_slot.status = "scheduled"
    selected_slot.calendar_link = calendar_link
    db.query(Interview).filter(
        Interview.application_id == application.id,
        Interview.id != selected_slot.id,
        Interview.status == "proposed",
    ).update({"status": "cancelled"})
    application.status = "interview_scheduled"
    db.commit()
    db.refresh(selected_slot)
    send_interview_email(current_user.email, current_user.name, job.title, selected_slot.scheduled_at, calendar_link)
    hr_email = db.query(User).filter(
        User.company_id == job.company_id,
        User.role == "hr",
    ).first()
    if hr_email:
        send_interview_email(
            hr_email.email,
            hr_email.name,
            job.title,
            selected_slot.scheduled_at,
            calendar_link,
        )
    return selected_slot
@app.put("/interviews/{interview_id}/feedback")
def update_interview_feedback(
    interview_id: int,
    payload: FeedbackUpdate,
    current_user: User = Depends(require_role(["hr"])),
    db: Session = Depends(get_db),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    application = db.query(Application).filter(Application.id == interview.application_id).first()
    job = db.query(Job).filter(Job.id == application.job_id).first()

    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this interview")

    interview.feedback = payload.feedback
    db.commit()
    db.refresh(interview)
    return interview
@app.get("/analytics/summary")
def get_analytics_summary(current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    company_id = current_user.company_id

    total_jobs = db.query(func.count(Job.id)).filter(Job.company_id == company_id).scalar()

    total_applications = (
        db.query(func.count(Application.id))
        .join(Job, Application.job_id == Job.id)
        .filter(Job.company_id == company_id)
        .scalar()
    )

    hired_count = (
        db.query(func.count(Application.id))
        .join(Job, Application.job_id == Job.id)
        .filter(Job.company_id == company_id, Application.status == "hired")
        .scalar()
    )

    rejected_count = (
        db.query(func.count(Application.id))
        .join(Job, Application.job_id == Job.id)
        .filter(Job.company_id == company_id, Application.status == "rejected")
        .scalar()
    )

    avg_score = (
        db.query(func.avg(Application.match_score))
        .join(Job, Application.job_id == Job.id)
        .filter(Job.company_id == company_id, Application.match_score.isnot(None))
        .scalar()
    )

    return {
        "total_jobs": total_jobs or 0,
        "total_applications": total_applications or 0,
        "hired_count": hired_count or 0,
        "rejected_count": rejected_count or 0,
        "average_match_score": round(avg_score, 1) if avg_score is not None else None,
    }