"""Gmail SMTP email notifications for KLE Tech Grievance Portal."""

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

import config

KLE_HEADER = """
  <div style="background:linear-gradient(135deg,#0A2463 0%,#1B4F9B 100%);padding:24px 32px;text-align:center;">
    <div style="font-size:28px;margin-bottom:6px;">🛡️</div>
    <h2 style="color:#fff;margin:0;font-family:'Georgia',serif;font-size:20px;letter-spacing:-0.3px;">
      KLE Technological University
    </h2>
    <p style="color:#D4A017;margin:4px 0 0;font-size:13px;font-weight:600;letter-spacing:0.5px;">
      BELAGAVI CAMPUS — GRIEVANCE PORTAL
    </p>
  </div>
"""

KLE_FOOTER = """
  <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E2E8F4;font-size:11px;color:#6B7FA8;text-align:center;line-height:1.6;">
    <p style="margin:0;">KLE Technological University — Belagavi Campus, Karnataka – 590008</p>
    <p style="margin:2px 0;">📧 grievance@kletech.ac.in &nbsp;|&nbsp; 📞 +91-831-2498100</p>
    <p style="margin:2px 0;">🌐 www.kletech.ac.in</p>
    <p style="margin:8px 0 0;font-size:10px;color:#A8B4CC;">
      NAAC 'A' Grade | UGC Recognised | AICTE Approved | NBA Accredited
    </p>
    <p style="margin:4px 0 0;font-size:10px;color:#A8B4CC;">
      This is an automated email from the KLE Tech Grievance Portal. Please do not reply directly.
    </p>
  </div>
"""


def _send_email(to_email: str, subject: str, html_body: str, cc_emails: list[str] | None = None) -> None:
    if not config.EMAIL_USER or not config.EMAIL_PASS:
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = f'"KLE Tech Grievance Portal" <{config.EMAIL_USER}>'
    msg["To"] = to_email
    msg["Subject"] = subject
    recipients = [to_email]
    if cc_emails:
        clean_cc = [c for c in cc_emails if c]
        if clean_cc:
            msg["Cc"] = ", ".join(clean_cc)
            recipients.extend(clean_cc)

    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
        server.login(config.EMAIL_USER, config.EMAIL_PASS)
        server.sendmail(config.EMAIL_USER, recipients, msg.as_string())


def send_complaint_confirmation(
    to_email: str,
    to_name: str,
    complaint_id: int,
    title: str,
) -> None:
    """Send confirmation email after a student submits a complaint."""
    if not config.EMAIL_USER or not config.EMAIL_PASS:
        return

    html = f"""
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #E2E8F4;border-radius:12px;overflow:hidden;">
        {KLE_HEADER}
        <div style="padding:32px;">
          <p style="font-size:15px;color:#0A1628;">Dear <strong>{escape(to_name)}</strong>,</p>
          <p style="color:#2C3E6B;">Your complaint has been successfully submitted to the KLE Tech Grievance Portal. Here are your details:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;width:40%;color:#0A2463;border-radius:6px 0 0 0;">Complaint ID</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#0A2463;font-weight:700;">#{complaint_id}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Title</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">{escape(title)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;border-radius:0 0 0 6px;">Status</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#D4A017;font-weight:600;">Pending</td>
            </tr>
          </table>
          <p style="color:#2C3E6B;font-size:14px;">All complaints are reviewed within <strong>3 working days</strong>. You will be notified when your complaint status is updated.</p>
          <p style="color:#6B7FA8;font-size:13px;">Track your complaint at the KLE Tech Grievance Portal.</p>
          {KLE_FOOTER}
        </div>
      </div>
    """
    try:
        _send_email(
            to_email=to_email,
            subject=f"✅ Complaint #{complaint_id} Received — KLE Tech Grievance Portal",
            html_body=html,
        )
        print(f"📧 Confirmation email sent to {to_email}")
    except Exception as exc:
        print(f"📧 Email send failed: {exc}")


def send_status_update(
    to_email: str,
    to_name: str,
    complaint_id: int | str,
    title: str,
    new_status: str,
) -> None:
    """Send status change notification email to student."""
    if not config.EMAIL_USER or not config.EMAIL_PASS:
        return

    status_colors = {
        "Pending": "#D4A017",
        "In Progress": "#1B4F9B",
        "Resolved": "#0F7B4E",
    }
    color = status_colors.get(new_status, "#0A2463")

    html = f"""
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #E2E8F4;border-radius:12px;overflow:hidden;">
        {KLE_HEADER}
        <div style="padding:32px;">
          <p style="font-size:15px;color:#0A1628;">Dear <strong>{escape(to_name)}</strong>,</p>
          <p style="color:#2C3E6B;">Your complaint status has been updated:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;width:40%;color:#0A2463;">Complaint ID</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#0A2463;font-weight:700;">#{complaint_id}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Title</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">{escape(title)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">New Status</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:{color};font-weight:700;">{escape(new_status)}</td>
            </tr>
          </table>
          {KLE_FOOTER}
        </div>
      </div>
    """
    try:
        _send_email(
            to_email=to_email,
            subject=f"🔔 Complaint #{complaint_id} Status Updated — KLE Tech Grievance Portal",
            html_body=html,
        )
    except Exception as exc:
        print(f"📧 Status email failed: {exc}")


def send_hod_notification(
    hod_email: str | None,
    hod_name: str | None,
    dept_email: str | None,
    dept_name: str,
    dept_code: str,
    complaint_id: int,
    student_name: str,
    category: str,
    priority: str,
    description: str,
) -> None:
    """Send department complaint alert email to HoD and department inbox."""
    if not config.EMAIL_USER or not config.EMAIL_PASS or not hod_email:
        return

    raw_desc = description or ""
    desc_snippet = raw_desc[:200] + ("..." if len(raw_desc) > 200 else "")
    priority_color = "#B91C1C" if priority == "High" else ("#B45309" if priority == "Medium" else "#0F7B4E")

    html = f"""
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #E2E8F4;border-radius:12px;overflow:hidden;">
        {KLE_HEADER}
        <div style="padding:32px;">
          <p style="font-size:15px;color:#0A1628;">Dear <strong>{escape(hod_name or 'Head of Department')}</strong>,</p>
          <p style="color:#2C3E6B;">A new student complaint has been submitted to your department.</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;width:40%;color:#0A2463;">Complaint ID</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#0A2463;font-weight:700;">#C-2025-{str(complaint_id).zfill(4)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Student</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">{escape(student_name)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Department</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">{escape(dept_name)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Category</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">{escape(category)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Priority</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:{priority_color};font-weight:600;">{escape(priority)}</td>
            </tr>
          </table>

          <div style="background:#F7F8FC;border-left:3px solid #0A2463;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#6B7FA8;font-weight:600;">Description:</p>
            <p style="margin:6px 0 0;font-size:14px;color:#2C3E6B;line-height:1.6;">{escape(desc_snippet)}</p>
          </div>

          <p style="color:#2C3E6B;font-size:14px;">Please review and respond via the KLE Tech Grievance Portal.</p>
          {KLE_FOOTER}
        </div>
      </div>
    """
    try:
        _send_email(
            to_email=hod_email,
            cc_emails=[dept_email or "", "grievance@kletech.ac.in"],
            subject=f"[KLE Tech Grievance Portal] New Complaint — {dept_code} Department",
            html_body=html,
        )
        print(f"📧 HOD notification sent to {hod_email} (CC: {dept_email})")
    except Exception as exc:
        print(f"📧 HOD notification failed: {exc}")
