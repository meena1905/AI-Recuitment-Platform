from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import User
from auth import hash_password, verify_password, create_access_token, decode_access_token
from models import User, Company , Job
app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database session dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Auth dependency: verifies JWT and returns the logged-in user ---
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

# --- Role-based access control dependency ---
def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
        return current_user
    return role_checker

# --- Request body schemas ---
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

# --- Routes ---
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
    jobs = db.query(Job).filter(Job.status == "published").all()
    return jobs