from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import UploadFile, File
import os
try:
    from embeddings import calculate_similarity
    EMBEDDINGS_AVAILABLE = True
except Exception:
    EMBEDDINGS_AVAILABLE = False
import uuid
from ai_scorer import score_resume_against_job
from pydantic import BaseModel
from database import SessionLocal
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks
from models import User
from notifications import send_status_email
from resume_parser import extract_text_from_pdf
from auth import hash_password, verify_password, create_access_token, decode_access_token
from models import User, Company, Job, Application,Interview
import redis
import json as json_lib
from calendar_integration import create_interview_event
from prometheus_fastapi_instrumentator import Instrumentator

redis_client = redis.Redis(host="redis", port=6379, decode_responses=True)
app = FastAPI()
Instrumentator().instrument(app).expose(app)
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                   "https://ai-recuitment-platform-egxp.vercel.app",
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
@app.get("/jobs/public")
def list_public_jobs(db: Session = Depends(get_db)):
    cached = redis_client.get("public_jobs")
    if cached:
        return json_lib.loads(cached)
    

    jobs = db.query(Job).filter(Job.status == "published").all()
    result = [{"id": j.id, "title": j.title, "description": j.description, "requirements": j.requirements, "status": j.status, "company_id": j.company_id, "created_at": j.created_at.isoformat()} for j in jobs]

    redis_client.setex("public_jobs", 60, json_lib.dumps(result))
    return result
def run_scoring_task(application_id: int):
    db = SessionLocal()
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return

        job = db.query(Job).filter(Job.id == application.job_id).first()
        resume_text = extract_text_from_pdf(application.resume_url)

        if EMBEDDINGS_AVAILABLE:
           job_text = f"{job.description} {job.requirements}"
           embedding_similarity = calculate_similarity(resume_text, job_text)
           print(f"Embedding similarity for application {application_id}: {embedding_similarity}")

        result = score_resume_against_job(resume_text, job.description, job.requirements)

        application.match_score = result["match_score"]
        application.ai_explanation = result["explanation"]
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
    if not resume.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    contents = await resume.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    unique_filename = f"{uuid.uuid4()}.pdf"
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
@app.get("/applications/mine")
def list_my_applications(current_user: User = Depends(require_role(["candidate"])), db: Session = Depends(get_db)):
    applications = db.query(Application).filter(Application.candidate_id == current_user.id).all()
    return applications
@app.get("/jobs/{job_id}/applicants")
def list_applicants(job_id: int, current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this job")
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    return applications
@app.get("/applications/{application_id}/resume-text")
def get_resume_text(application_id: int, current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this application")
    text = extract_text_from_pdf(application.resume_url)
    return {"application_id": application_id, "extracted_text": text}
@app.post("/applications/{application_id}/score")
def score_application(application_id: int, current_user: User = Depends(require_role(["hr"])), db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="You do not have access to this application")
    resume_text = extract_text_from_pdf(application.resume_url)
    result = score_resume_against_job(resume_text, job.description, job.requirements)
    application.match_score = result["match_score"]
    application.ai_explanation = result["explanation"]
    db.commit()
    db.refresh(application)
    return application
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
    new_interview = Interview(
        application_id=application_id,
        scheduled_at=payload.scheduled_at,
        status="scheduled",
    )
    db.add(new_interview)
    application.status = "interview_scheduled"
    db.commit()
    db.refresh(new_interview)

    candidate = db.query(User).filter(User.id == application.candidate_id).first()
    try:
        calendar_link = create_interview_event(candidate.email, job.title, payload.scheduled_at)
        print(f"Calendar event created: {calendar_link}")
    except Exception as e:
        print(f"Calendar event creation failed: {e}")

    return new_interview
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