from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text
from datetime import datetime
from database import Base
class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    requirements = Column(Text)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_url = Column(String)
    status = Column(String, default="applied")
    match_score = Column(Float, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    candidate_name = Column(String, nullable=True)
    candidate_email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    skills = Column(Text, nullable=True)
    experience = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    skills_score = Column(Float, nullable=True)
    experience_score = Column(Float, nullable=True)
    education_score = Column(Float, nullable=True)
    applied_at = Column(DateTime, default=datetime.utcnow)
class Interview(Base):
    __tablename__ = "interviews"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    scheduled_at = Column(DateTime)
    calendar_link = Column(String, nullable=True)
    status = Column(String, default="scheduled")
    feedback = Column(Text, nullable=True)