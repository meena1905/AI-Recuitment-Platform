from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
import os

load_dotenv()

message = Mail(
    from_email=os.getenv("SENDGRID_FROM_EMAIL"),
    to_emails=os.getenv("SENDGRID_FROM_EMAIL"),  # sending to yourself for this test
    subject="Test email from recruitment platform",
    plain_text_content="If you see this, SendGrid is working correctly."
)

try:
    sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
    response = sg.send(message)
    print(f"Status code: {response.status_code}")
    print("Email sent successfully!")
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'body'):
        print(f"Details: {e.body}")