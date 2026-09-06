from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Attachment, Mail
from sendgrid.helpers.mail import FileContent, FileName, FileType, Disposition
from dotenv import load_dotenv
from datetime import datetime, timedelta
import base64
import os
load_dotenv()
def send_status_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    new_status: str,
    rejection_feedback: str | None = None,
):
    status_messages = {
        "shortlisted": f"Great news! You've been shortlisted for the {job_title} position.",
        "interview_scheduled": f"An interview has been scheduled for your {job_title} application.",
        "hired": f"Congratulations! You've been hired for the {job_title} position.",
        "rejected": f"Thank you for applying to {job_title}. We've decided to move forward with other candidates.",
    }
    message_body = status_messages.get(new_status, f"Your application status for {job_title} has changed to {new_status}.")
    if new_status == "rejected" and rejection_feedback:
        message_body = f"{message_body}\n\nConstructive feedback for future opportunities:\n{rejection_feedback}"
    message = Mail(
        from_email=os.getenv("SENDGRID_FROM_EMAIL"),
        to_emails=to_email,
        subject=f"Application Update: {job_title}",
        plain_text_content=f"Hi {candidate_name},\n\n{message_body}\n\nBest,\nRecruitment Team"
    )
    try:
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        sg.send(message)
        print(f"Notification sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_interview_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    scheduled_at: str,
    calendar_link: str,
):
    message = Mail(
        from_email=os.getenv("SENDGRID_FROM_EMAIL"),
        to_emails=to_email,
        subject=f"Interview scheduled: {job_title}",
        plain_text_content=(
            f"Hi {candidate_name},\n\n"
            f"Your interview for the {job_title} position has been scheduled.\n\n"
            f"Date and time: {scheduled_at}\n"
            f"Join the interview: {calendar_link}\n\n"
            "Please use the link above at the scheduled time.\n\n"
            "Best,\nRecruitment Team"
        ),
    )
    try:
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        sg.send(message)
        print(f"Interview invitation sent to {to_email}")
    except Exception as e:
        print(f"Failed to send interview invitation: {e}")

def _build_slots_ics(job_title: str, slots: list[dict]) -> str:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Talenta//Recruitment Platform//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
    ]
    for slot in slots:
        start = datetime.fromisoformat(slot.get("scheduled_at", slot.get("time")))
        end = start + timedelta(minutes=30)
        link = slot.get("calendar_link", slot.get("link"))
        lines += [
            "BEGIN:VEVENT",
            f"UID:talenta-slot-{slot['id']}@recruitment",
            f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
            f"DTSTART:{start.strftime('%Y%m%dT%H%M%S')}",
            f"DTEND:{end.strftime('%Y%m%dT%H%M%S')}",
            f"SUMMARY:Interview - {job_title}",
            f"DESCRIPTION:Interview for {job_title}. Join the meeting: {link}",
            f"URL:{link}",
            "BEGIN:VALARM",
            "TRIGGER:-PT10M",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Your interview for {job_title} starts in 10 minutes",
            "END:VALARM",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def send_interview_slots_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    scheduled_slots: list[dict],
):
    slot_list = "\n\n".join(
        f"{slot.get('scheduled_at', slot.get('time'))}\nJoin: {slot.get('calendar_link', slot.get('link'))}"
        for slot in scheduled_slots
    )
    message = Mail(
        from_email=os.getenv("SENDGRID_FROM_EMAIL"),
        to_emails=to_email,
        subject=f"Choose an interview time: {job_title}",
        plain_text_content=(
            f"Hi {candidate_name},\n\n"
            f"Please choose an interview time for the {job_title} position.\n\n"
            f"Available slots:\n\n{slot_list}\n\n"
            "You received a calendar invitation (.ics) with these options — add your "
            "preferred one to your calendar, or sign in to the recruitment platform and "
            "open My applications to confirm your time.\n\n"
            "Best,\nRecruitment Team"
        ),
    )
    try:
        ics = _build_slots_ics(job_title, scheduled_slots)
        message.attachment = Attachment(
            FileContent(base64.b64encode(ics.encode("utf-8")).decode()),
            FileName("interview-slots.ics"),
            FileType("text/calendar"),
            Disposition("attachment"),
        )
    except Exception as e:
        print(f"Failed to attach calendar invite: {e}")
    try:
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        sg.send(message)
        print(f"Interview slot options sent to {to_email}")
    except Exception as e:
        print(f"Failed to send interview slot options: {e}")

def send_hr_interview_email(
    to_email: str,
    hr_name: str,
    candidate_name: str,
    candidate_email: str,
    job_title: str,
    scheduled_at: str,
    calendar_link: str,
):
    message = Mail(
        from_email=os.getenv("SENDGRID_FROM_EMAIL"),
        to_emails=to_email,
        subject=f"Interview Scheduled: {candidate_name} - {job_title}",
        plain_text_content=(
            f"Hi {hr_name},\n\n"
            f"An interview has been scheduled for candidate {candidate_name} ({candidate_email}) for the {job_title} position.\n\n"
            f"Date and time: {scheduled_at}\n"
            f"Join the interview: {calendar_link}\n\n"
            "Best,\nRecruitment Platform"
        ),
    )
    try:
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        sg.send(message)
        print(f"HR interview notification sent to {to_email}")
    except Exception as e:
        print(f"Failed to send HR interview notification: {e}")
