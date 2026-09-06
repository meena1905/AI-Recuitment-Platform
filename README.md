# AI Recruitment Platform

[Live Link](https://ai-rag-agent-myfggxkskh5tttnwmlv9qg.streamlit.app/)


AI-powered recruitment platform with automated resume scoring, ranking, and multi-slot interview scheduling. Candidates get instant AI match scores with explanations; HR reviews ranked applicants and sends interviews with auto-generated meeting links and calendar invites.

Built with **FastAPI**, **Next.js**, **PostgreSQL**, **Redis**, and **GROQ LLM**.

## Features

- **Candidates**: browse jobs, apply by uploading a resume (PDF/DOCX), get instant AI match scores, track applications.
- **HR**: post and publish jobs, view ranked applicants, bulk-upload resumes and compare candidates with AI, update statuses, see hiring analytics.
- **Interviews**: schedule up to 5 slots per candidate, auto-generated meeting links shared with both sides, email + calendar (.ics) invites, "Join Interview" buttons.

## Tech Stack

| Layer     | Tech                                        |
|-----------|---------------------------------------------|
| Backend   | Python, FastAPI, SQLAlchemy                 |
| Frontend  | Next.js, React, TypeScript, Tailwind CSS    |
| Database  | PostgreSQL                                  |
| AI        | GROQ LLM (scoring, RAG chat, comparison)    |
| Other     | Redis, SendGrid, Google Calendar (+Jitsi fallback), Prometheus/Grafana |

## Getting Started

### Docker (full stack with Prometheus + Grafana)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (docs at `/docs`)

### Manual

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev            # http://localhost:3000
```

## Environment Variables

Backend (`.env`):

```
DATABASE_URL=<postgres connection string>
JWT_SECRET_KEY=<random secret>
GROQ_API_KEY=<groq key>                  # AI features
SENDGRID_API_KEY=<sendgrid key>          # email notifications
GOOGLE_CREDENTIALS_JSON=<optional>       # Google Calendar; otherwise Jitsi links
```

Frontend (optional):

```
BACKEND_URL=<your backend URL>   # overrides the /api rewrite target
```

## Deployment

- **Frontend** on Vercel, **Backend** on Render, **Database** on Supabase/Postgres.
- Push to `main` auto-deploys both.
- `/api/*` requests on the frontend are proxied to the backend URL.

## Key API Endpoints

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| POST   | `/auth/register` / `/auth/login`  | Auth                                 |
| GET    | `/jobs/public`                    | Published jobs                       |
| POST   | `/jobs/{id}/apply`                | Apply with resume                    |
| GET    | `/jobs/{id}/applicants`           | Ranked applicants (HR)               |
| POST   | `/applications/{id}/interview-slots` | Propose up to 5 slots (HR)         |
| POST   | `/interview-slots/{id}/select`    | Candidate picks a slot               |
| GET    | `/analytics/dashboard`            | Hiring analytics (HR)                |

Interactive docs: `https://<backend>/docs`

## License

MIT License-Developed by Meenakshi S
