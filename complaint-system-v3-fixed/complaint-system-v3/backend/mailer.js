const nodemailer = require('nodemailer');

// ── Transport ─────────────────────────────────────────────────
// Uses Gmail SMTP. Needs EMAIL_USER + EMAIL_PASS (App Password) in .env
// If EMAIL_USER is blank, all send calls become silent no-ops so the app
// still works without email configured.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── KLE Tech Belagavi branded email header ────────────────────
const KLE_HEADER = `
  <div style="background:linear-gradient(135deg,#0A2463 0%,#1B4F9B 100%);padding:24px 32px;text-align:center;">
    <div style="font-size:28px;margin-bottom:6px;">🛡️</div>
    <h2 style="color:#fff;margin:0;font-family:'Georgia',serif;font-size:20px;letter-spacing:-0.3px;">
      KLE Technological University
    </h2>
    <p style="color:#D4A017;margin:4px 0 0;font-size:13px;font-weight:600;letter-spacing:0.5px;">
      BELAGAVI CAMPUS — GRIEVANCE PORTAL
    </p>
  </div>
`;

const KLE_FOOTER = `
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
`;

// ── sendComplaintConfirmation ─────────────────────────────────
// Called after a student submits a complaint
async function sendComplaintConfirmation({ toEmail, toName, complaintId, title }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return; // email not configured

  const mailOptions = {
    from: `"KLE Tech Grievance Portal" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `✅ Complaint #${complaintId} Received — KLE Tech Grievance Portal`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #E2E8F4;border-radius:12px;overflow:hidden;">
        ${KLE_HEADER}
        <div style="padding:32px;">
          <p style="font-size:15px;color:#0A1628;">Dear <strong>${toName}</strong>,</p>
          <p style="color:#2C3E6B;">Your complaint has been successfully submitted to the KLE Tech Grievance Portal. Here are your details:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;width:40%;color:#0A2463;border-radius:6px 0 0 0;">Complaint ID</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#0A2463;font-weight:700;">#${complaintId}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Title</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">${title}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;border-radius:0 0 0 6px;">Status</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#D4A017;font-weight:600;">Pending</td>
            </tr>
          </table>
          <p style="color:#2C3E6B;font-size:14px;">All complaints are reviewed within <strong>3 working days</strong>. You will be notified when your complaint status is updated.</p>
          <p style="color:#6B7FA8;font-size:13px;">Track your complaint at the KLE Tech Grievance Portal.</p>
          ${KLE_FOOTER}
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Confirmation email sent to ${toEmail}`);
  } catch (err) {
    // Non-fatal — log but don't crash the request
    console.error('📧 Email send failed:', err.message);
  }
}

// ── sendStatusUpdate ──────────────────────────────────────────
// Called when admin changes complaint status
async function sendStatusUpdate({ toEmail, toName, complaintId, title, newStatus }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const statusColors = {
    'Pending':     '#D4A017',
    'In Progress': '#1B4F9B',
    'Resolved':    '#0F7B4E',
  };
  const color = statusColors[newStatus] || '#0A2463';

  const mailOptions = {
    from: `"KLE Tech Grievance Portal" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🔔 Complaint #${complaintId} Status Updated — KLE Tech Grievance Portal`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #E2E8F4;border-radius:12px;overflow:hidden;">
        ${KLE_HEADER}
        <div style="padding:32px;">
          <p style="font-size:15px;color:#0A1628;">Dear <strong>${toName}</strong>,</p>
          <p style="color:#2C3E6B;">Your complaint status has been updated:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;width:40%;color:#0A2463;">Complaint ID</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#0A2463;font-weight:700;">#${complaintId}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Title</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">${title}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">New Status</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:${color};font-weight:700;">${newStatus}</td>
            </tr>
          </table>
          ${KLE_FOOTER}
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('📧 Status email failed:', err.message);
  }
}

// ── sendHodNotification ───────────────────────────────────────
// Called when a new complaint is routed to a department
async function sendHodNotification({
  hodEmail, hodName, deptEmail, deptName, deptCode,
  complaintId, studentName, category, priority, description, title
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const descSnippet = (description || '').substring(0, 200) + ((description || '').length > 200 ? '...' : '');

  const mailOptions = {
    from: `"KLE Tech Grievance Portal" <${process.env.EMAIL_USER}>`,
    to: hodEmail,
    cc: [deptEmail, 'grievance@kletech.ac.in'].filter(Boolean).join(', '),
    subject: `[KLE Tech Grievance Portal] New Complaint — ${deptCode} Department`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #E2E8F4;border-radius:12px;overflow:hidden;">
        ${KLE_HEADER}
        <div style="padding:32px;">
          <p style="font-size:15px;color:#0A1628;">Dear <strong>${hodName}</strong>,</p>
          <p style="color:#2C3E6B;">A new student complaint has been submitted to your department.</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;width:40%;color:#0A2463;">Complaint ID</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#0A2463;font-weight:700;">#C-2025-${String(complaintId).padStart(4, '0')}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Student</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">${studentName}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Department</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">${deptName}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Category</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:#2C3E6B;">${category}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#EEF1FA;font-weight:600;color:#0A2463;">Priority</td>
              <td style="padding:10px 14px;border:1px solid #E2E8F4;color:${priority === 'High' ? '#B91C1C' : priority === 'Medium' ? '#B45309' : '#0F7B4E'};font-weight:600;">${priority}</td>
            </tr>
          </table>

          <div style="background:#F7F8FC;border-left:3px solid #0A2463;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#6B7FA8;font-weight:600;">Description:</p>
            <p style="margin:6px 0 0;font-size:14px;color:#2C3E6B;line-height:1.6;">${descSnippet}</p>
          </div>

          <p style="color:#2C3E6B;font-size:14px;">Please review and respond via the KLE Tech Grievance Portal.</p>

          ${KLE_FOOTER}
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 HOD notification sent to ${hodEmail} (CC: ${deptEmail})`);
  } catch (err) {
    console.error('📧 HOD notification failed:', err.message);
  }
}

module.exports = { sendComplaintConfirmation, sendStatusUpdate, sendHodNotification };
