from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
import os
load_dotenv()
def send_status_email(to_email: str, candidate_name: str, job_title: str, new_status: str):
    status_messages = {
        "shortlisted": f"Great news! You've been shortlisted for the {job_title} position.",
        "interview_scheduled": f"An interview has been scheduled for your {job_title} application.",
        "hired": f"Congratulations! You've been hired for the {job_title} position.",
        "rejected": f"Thank you for applying to {job_title}. We've decided to move forward with other candidates.",
    }
    message_body = status_messages.get(new_status, f"Your application status for {job_title} has changed to {new_status}.")
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

def send_interview_slots_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    scheduled_slots: list[str],
):
    slot_list = "\n".join(f"- {slot}" for slot in scheduled_slots)
    message = Mail(
        from_email=os.getenv("SENDGRID_FROM_EMAIL"),
        to_emails=to_email,
        subject=f"Choose an interview time: {job_title}",
        plain_text_content=(
            f"Hi {candidate_name},\n\n"
            f"Please choose an interview time for the {job_title} position:\n\n"
            f"{slot_list}\n\n"
            "Sign in to the recruitment platform and open My applications to select your preferred time.\n\n"
            "Best,\nRecruitment Team"
        ),
    )
    try:
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        sg.send(message)
        print(f"Interview slot options sent to {to_email}")
    except Exception as e:
        print(f"Failed to send interview slot options: {e}")