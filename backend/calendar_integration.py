from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import os

SCOPES = ["https://www.googleapis.com/auth/calendar"]

def get_calendar_service():
    flow = InstalledAppFlow.from_client_secrets_file("google_credentials.json", SCOPES)
    creds = flow.run_local_server(port=0)
    return build("calendar", "v3", credentials=creds)

def create_interview_event(candidate_email: str, job_title: str, scheduled_at: str):
    service = get_calendar_service()
    event = {
        "summary": f"Interview: {job_title}",
        "start": {"dateTime": scheduled_at, "timeZone": "Asia/Kolkata"},
        "end": {"dateTime": scheduled_at, "timeZone": "Asia/Kolkata"},
        "attendees": [{"email": candidate_email}],
        "conferenceData": {
            "createRequest": {"requestId": f"meet-{scheduled_at}"}
        },
    }
    created_event = service.events().insert(
        calendarId="primary", body=event, sendUpdates="all", conferenceDataVersion=1
    ).execute()
    return created_event.get("hangoutLink", created_event.get("htmlLink"))