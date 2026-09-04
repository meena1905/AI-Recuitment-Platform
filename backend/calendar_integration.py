from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from datetime import datetime, timedelta
from pathlib import Path
import uuid

SCOPES = ["https://www.googleapis.com/auth/calendar"]
BASE_DIR = Path(__file__).resolve().parent
CREDENTIALS_FILE = BASE_DIR / "google_credentials.json"
TOKEN_FILE = BASE_DIR / "token.json"

def get_calendar_service():
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0, access_type="offline")
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")

    return build("calendar", "v3", credentials=creds)

def create_interview_event(candidate_email: str, job_title: str, scheduled_at: str | datetime):
    service = get_calendar_service()
    start_time = (
        datetime.fromisoformat(scheduled_at)
        if isinstance(scheduled_at, str)
        else scheduled_at
    )
    end_time = start_time + timedelta(minutes=30)
    event = {
        "summary": f"Interview: {job_title}",
        "start": {"dateTime": start_time.isoformat(), "timeZone": "Asia/Kolkata"},
        "end": {"dateTime": end_time.isoformat(), "timeZone": "Asia/Kolkata"},
        "attendees": [{"email": candidate_email}],
        "conferenceData": {
            "createRequest": {
                "requestId": f"meet-{uuid.uuid4()}",
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
    }
    created_event = service.events().insert(
        calendarId="primary", body=event, sendUpdates="all", conferenceDataVersion=1
    ).execute()
    return created_event.get("hangoutLink", created_event.get("htmlLink"))