import logging
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service to deliver email notifications using standard SMTP."""

    def __init__(self):
        self.host = settings.SMTP_HOST or "smtp.gmail.com"
        self.port = settings.SMTP_PORT or 587
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        self.from_name = settings.SMTP_FROM_NAME or "Employee Onboarding Platform"
        self.tls = settings.SMTP_TLS

    def _refresh_settings(self):
        """Dynamically reload settings from .env in case credentials were updated at runtime."""
        try:
            from app.config import Settings
            fresh = Settings(_env_file=".env")
            if fresh.SMTP_USER and fresh.SMTP_PASSWORD:
                self.host = fresh.SMTP_HOST or "smtp.gmail.com"
                self.port = fresh.SMTP_PORT or 587
                self.user = fresh.SMTP_USER
                self.password = fresh.SMTP_PASSWORD
                self.from_email = fresh.SMTP_FROM_EMAIL or fresh.SMTP_USER
                self.from_name = fresh.SMTP_FROM_NAME or "Employee Onboarding Platform"
                self.tls = fresh.SMTP_TLS
        except Exception:
            pass

    def is_configured(self) -> bool:
        self._refresh_settings()
        return bool(self.user and self.password)

    def _extract_url(self, text: str) -> Optional[str]:
        """Finds the first HTTP/HTTPS link in a text string."""
        match = re.search(r"https?://[^\s|]+", text)
        return match.group(0) if match else None

    def send_tool_access_email(
        self,
        to_email: str,
        employee_name: str,
        tool_name: str,
        provisioning_message: Optional[str] = None
    ) -> bool:
        """Sends an access approval email to the employee with their credentials and login link."""
        self._refresh_settings()

        subject = f"[Access Granted] Your access details for {tool_name}"
        details = provisioning_message or f"Your access request for {tool_name} has been approved."
        action_url = self._extract_url(details)

        # Plain text version
        text_body = (
            f"Hi {employee_name},\n\n"
            f"Great news! Your access request for {tool_name} has been approved by the admin.\n\n"
            f"--- Access Details ---\n"
            f"{details}\n"
            f"----------------------\n\n"
            + (f"Sign-in URL: {action_url}\n\n" if action_url else "")
            + "Please remember to set your own secure password upon your first sign-in if prompted.\n\n"
            f"Best regards,\n"
            f"{self.from_name}\n"
        )

        # Rich HTML version
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
    .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; color: #ffffff; text-align: left; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.025em; }}
    .content {{ padding: 28px 24px; }}
    .greeting {{ font-size: 15px; margin-bottom: 16px; }}
    .details-box {{ background: #f1f5f9; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; font-family: monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; color: #0f172a; margin: 18px 0; }}
    .button-wrap {{ margin: 24px 0 16px 0; text-align: center; }}
    .btn {{ display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; letter-spacing: 0.01em; }}
    .notice {{ font-size: 12.5px; color: #64748b; line-height: 1.5; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 14px; }}
    .footer {{ text-align: center; font-size: 12px; color: #94a3b8; padding: 16px 24px 24px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Access Approved: {tool_name}</h1>
    </div>
    <div class="content">
      <p class="greeting">Hi <strong>{employee_name}</strong>,</p>
      <p>Your access request for <strong>{tool_name}</strong> has been approved by the administrator.</p>

      <div class="details-box">{details}</div>

      {"<div class='button-wrap'><a href='" + action_url + "' class='btn' target='_blank'>Open " + tool_name + "</a></div>" if action_url else ""}

      <div class="notice">
        🔒 <strong>Security reminder:</strong> If a temporary password was generated for you, please ensure you update it to your own secure private password upon first login.
      </div>
    </div>
    <div class="footer">
      Sent automatically by {self.from_name}
    </div>
  </div>
</body>
</html>
"""

        # If SMTP is not yet configured, log gracefully to console and exit without failing
        if not self.is_configured():
            logger.info(
                f"\n==================== [UNCONFIGURED SMTP EMAIL LOG] ====================\n"
                f"To: {to_email}\n"
                f"Subject: {subject}\n\n"
                f"{text_body}\n"
                f"========================================================================\n"
            )
            print(f"[EmailService] (Unconfigured SMTP) Dispatched notification to console for {to_email}")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            from_addr = self.from_email or self.user
            msg["From"] = f"{self.from_name} <{from_addr}>"
            msg["To"] = to_email

            part1 = MIMEText(text_body, "plain", "utf-8")
            part2 = MIMEText(html_body, "html", "utf-8")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(self.host, self.port, timeout=15) as server:
                if self.tls:
                    server.starttls()
                server.login(self.user, self.password)
                server.send_message(msg)

            logger.info(f"Successfully sent tool access email to {to_email} for {tool_name}")
            print(f"[EmailService] Successfully sent access email to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            print(f"[EmailService] Warning: Failed to send email to {to_email}: {e}")
            return False


email_service = EmailService()
