const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const db       = require('../db');
const { protect, requireRoles, studentOnly } = require('../middleware/authMiddleware');
const { sendComplaintConfirmation, sendStatusUpdate, sendHodNotification } = require('../mailer');
const { analyzeImage } = require('../utils/imageAnalyzer');
const router   = express.Router();

// ── FILE UPLOAD (Multer) ─────────────────────────────────────
const uploadDir      = path.join(__dirname, '..', 'uploads');
const voiceUploadDir = path.join(uploadDir, 'voice');
if (!fs.existsSync(uploadDir))      fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(voiceUploadDir)) fs.mkdirSync(voiceUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'voiceNote') {
      cb(null, voiceUploadDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'voiceNote') {
      const audioOk = /audio\/(webm|mp4|ogg|mpeg|wav)/i.test(file.mimetype);
      if (audioOk) return cb(null, true);
      cb(new Error('Invalid voice note format. Allowed: webm, mp4, ogg, wav'));
    } else {
      const allowed = /jpeg|jpg|png|gif|pdf|doc|docx/;
      const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
      const mimeOk  = allowed.test(file.mimetype);
      if (extOk && mimeOk) return cb(null, true);
      cb(new Error('Invalid file type. Allowed: JPG, PNG, GIF, PDF, DOC, DOCX'));
    }
  }
});

const uploadFields = upload.fields([
  { name: 'attachment', maxCount: 1 },
  { name: 'voiceNote',  maxCount: 1 }
]);

function handleMulterError(err, req, res, next) {
  if (err && err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  if (err) return res.status(400).json({ error: err.message });
  next();
}

// ── POST /api/complaints/check-image ─────────────────────────
router.post('/check-image', protect, upload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const result = await analyzeImage(req.file.path);
    fs.unlink(req.file.path, () => {});
    res.json(result);
  } catch (err) {
    console.error('Image check error:', err);
    res.status(500).json({ error: 'Image analysis failed' });
  }
});

// ── POST /api/complaints (Student Only) ──────────────────────
router.post('/', protect, studentOnly, uploadFields, handleMulterError, async (req, res) => {
  const {
    title,
    description,
    original_description,
    category,
    customCategory,
    priority,
    department_id,
    is_safety_hazard,
    urgency_level,
    sentiment_score,
    ai_structured_summary,
    ai_confidence,
  } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required' });
  }

  const FIXED_CATEGORIES = ['Academic', 'Infrastructure', 'Hostel', 'Library', 'Administration', 'Examination', 'Finance'];
  let finalCategory = category;

  if (category === 'Others') {
    const custom = (customCategory || '').trim();
    if (!custom) return res.status(400).json({ error: 'Please specify category name for "Others"' });
    if (custom.length > 100) return res.status(400).json({ error: 'Custom category must be 100 characters or fewer' });
    finalCategory = custom;
  }

  if (!department_id) {
    return res.status(400).json({ error: 'Please select a target university department' });
  }

  try {
    // Rate limit: max 3 complaints per 24 hours
    const [[{ cnt }]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM complaints
       WHERE user_id = ? AND created_at >= NOW() - INTERVAL 1 DAY`,
      [req.user.user_id]
    );
    if (cnt >= 3) {
      return res.status(429).json({
        error: 'You have reached the maximum limit of 3 complaints for today. Please try again later.'
      });
    }

    // Process attachments
    const attachmentFile = req.files?.attachment?.[0] || null;
    const voiceNoteFile  = req.files?.voiceNote?.[0]  || null;
    const attachment     = attachmentFile ? attachmentFile.filename : null;
    const voiceNotePath  = voiceNoteFile  ? `voice/${voiceNoteFile.filename}` : null;

    let isAiImage = 0;
    if (attachmentFile && /\.(jpg|jpeg|png)$/i.test(attachmentFile.originalname)) {
      try {
        const aiResult = await analyzeImage(attachmentFile.path);
        if (aiResult.isAiGenerated) isAiImage = 1;
      } catch (e) {
        console.error('AI image check error:', e.message);
      }
    }

    // Lookup department
    const [[dept]] = await db.query('SELECT * FROM departments WHERE id = ?', [department_id]);
    if (!dept) return res.status(400).json({ error: 'Invalid department selected' });

    const isSafety = is_safety_hazard === 'true' || is_safety_hazard === true || is_safety_hazard === 1 ? 1 : 0;
    const resolvedPriority = isSafety ? 'High' : (priority || 'Low');

    const [result] = await db.query(
      `INSERT INTO complaints
         (user_id, title, description, original_description, ai_structured_summary,
          category, priority, status, urgency_level, is_safety_hazard, sentiment_score, ai_confidence,
          attachment, is_ai_image, voice_note_path, department_id, department_code, routed_to_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        title.trim(),
        description.trim(),
        (original_description || description).trim(),
        ai_structured_summary || null,
        finalCategory,
        resolvedPriority,
        urgency_level || (isSafety ? 'Critical' : 'Normal'),
        isSafety,
        parseFloat(sentiment_score) || 0.0,
        parseFloat(ai_confidence) || null,
        attachment,
        isAiImage,
        voiceNotePath,
        dept.id,
        dept.code,
        dept.hod_email,
      ]
    );

    const complaintId = result.insertId;

    // In-app notifications
    // 1. All Admin users
    await db.query(
      `INSERT INTO notifications (user_id, complaint_id, message)
       SELECT user_id, ?, ? FROM users WHERE role = 'admin'`,
      [complaintId, `${isSafety ? '🚨 SAFETY ALERT: ' : ''}New complaint #${complaintId} [${dept.code}]: "${title}"`]
    );

    // 2. Department Coordinators assigned to this department
    await db.query(
      `INSERT INTO notifications (user_id, complaint_id, message)
       SELECT user_id, ?, ? FROM users
       WHERE role IN ('department_coordinator','faculty','staff') AND department_id = ?`,
      [complaintId, `${isSafety ? '🚨 SAFETY ALERT: ' : ''}New department complaint #${complaintId}: "${title}"`, dept.id]
    );

    // 3. Socket.io broadcast
    const io = req.app.get('io');
    if (io) {
      io.to('role_admin').to(`dept_${dept.id}`).emit('newComplaint', {
        complaint_id: complaintId,
        title,
        category: finalCategory,
        priority: resolvedPriority,
        department_code: dept.code,
        is_safety_hazard: isSafety,
        submitted_at: new Date(),
      });
    }

    // 4. Non-blocking Email notifications
    sendComplaintConfirmation({
      toEmail: req.user.email,
      toName: req.user.name,
      complaintId,
      title,
    });

    sendHodNotification({
      hodEmail: dept.hod_email,
      hodName: dept.hod_name,
      deptEmail: dept.dept_email,
      deptName: dept.name,
      deptCode: dept.code,
      complaintId,
      studentName: req.user.name,
      category: finalCategory,
      priority: resolvedPriority,
      description,
      title,
    });

    res.status(201).json({
      message: 'Department grievance submitted successfully',
      complaint_id: complaintId,
    });
  } catch (err) {
    console.error('Complaint submission error:', err);
    res.status(500).json({ error: 'Server error while submitting complaint' });
  }
});

// ── GET /api/complaints ──────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { role, user_id, department_id } = req.user;

    // Bus coordinators are strictly forbidden from department data
    if (role === 'bus_coordinator') {
      return res.status(403).json({ error: 'Access denied: Bus coordinators cannot access department complaints' });
    }

    const { status, category, priority, search, department_id: filterDeptId, safety_only } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    // Role-based scope isolation
    if (role === 'student') {
      where += ' AND c.user_id = ?';
      params.push(user_id);
    } else if (['department_coordinator', 'faculty', 'staff'].includes(role)) {
      // Dept coordinator sees ONLY their own department
      where += ' AND c.department_id = ?';
      params.push(department_id || 0);
    }
    // Admin sees all

    if (filterDeptId && role === 'admin') {
      where += ' AND c.department_id = ?';
      params.push(filterDeptId);
    }
    if (status) {
      where += ' AND c.status = ?';
      params.push(status);
    }
    if (category) {
      where += ' AND c.category = ?';
      params.push(category);
    }
    if (priority) {
      where += ' AND c.priority = ?';
      params.push(priority);
    }
    if (safety_only === 'true' || safety_only === '1') {
      where += ' AND c.is_safety_hazard = 1';
    }
    if (search) {
      where += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Anonymization for department coordinator/faculty if requested by policy
    const nameExpr  = (role === 'faculty') ? "'Anonymous' AS student_name" : 'u.name AS student_name';
    const emailExpr = (role === 'faculty') ? "'hidden@privacy' AS student_email" : 'u.email AS student_email';

    const [rows] = await db.query(
      `SELECT c.*, ${nameExpr}, ${emailExpr},
              d.name AS department_name, d.code AS department_code, d.icon AS department_icon
       FROM complaints c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN departments d ON c.department_id = d.id
       ${where}
       ORDER BY c.is_safety_hazard DESC, c.created_at DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Error fetching complaints:', err);
    res.status(500).json({ error: 'Server error while fetching complaints' });
  }
});

// ── GET /api/complaints/:id ──────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const { role, user_id, department_id } = req.user;

    if (role === 'bus_coordinator') {
      return res.status(403).json({ error: 'Access denied: Bus coordinators cannot access department complaints' });
    }

    const [complaints] = await db.query(
      `SELECT c.*,
              u.name AS student_name, u.email AS student_email,
              d.name AS department_name, d.icon AS department_icon,
              d.hod_name, d.hod_email AS dept_hod_email, d.dept_email
       FROM complaints c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE c.complaint_id = ?`,
      [req.params.id]
    );

    if (!complaints.length) return res.status(404).json({ error: 'Complaint not found' });
    const complaint = complaints[0];

    // Authorization checks
    if (role === 'student' && complaint.user_id !== user_id) {
      return res.status(403).json({ error: 'Access denied to this grievance' });
    }
    if (['department_coordinator', 'faculty', 'staff'].includes(role) && complaint.department_id !== department_id) {
      return res.status(403).json({ error: 'Access denied: Grievance does not belong to your department' });
    }

    const [responses] = await db.query(
      `SELECT r.*, u.name AS admin_name, u.role AS responder_role
       FROM responses r
       JOIN users u ON r.admin_id = u.user_id
       WHERE r.complaint_id = ?
       ORDER BY r.responded_at ASC`,
      [req.params.id]
    );

    res.json({ ...complaint, responses });
  } catch (err) {
    console.error('Error getting complaint details:', err);
    res.status(500).json({ error: 'Server error while retrieving complaint' });
  }
});

// ── PUT /api/complaints/:id/status ───────────────────────────
router.put('/:id/status', protect, requireRoles('department_coordinator', 'faculty', 'staff', 'admin'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Pending', 'In Progress', 'Resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const [[complaint]] = await db.query('SELECT * FROM complaints WHERE complaint_id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Enforce department scope
    if (['department_coordinator', 'faculty', 'staff'].includes(req.user.role) && complaint.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Access denied: You can only update complaints within your department' });
    }

    await db.query('UPDATE complaints SET status = ? WHERE complaint_id = ?', [status, req.params.id]);

    // Student notification
    const [[student]] = await db.query('SELECT user_id, email, name FROM users WHERE user_id = ?', [complaint.user_id]);
    if (student) {
      const msg = `Your grievance #${complaint.complaint_id} status updated to: ${status}`;
      await db.query('INSERT INTO notifications (user_id, complaint_id, message) VALUES (?, ?, ?)', [student.user_id, req.params.id, msg]);

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${student.user_id}`).emit('notification', { message: msg });
      }

      sendStatusUpdate({
        toEmail: student.email,
        toName: student.name,
        complaintId: req.params.id,
        title: complaint.title,
        newStatus: status,
      });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Failed to update complaint status' });
  }
});

// ── POST /api/complaints/:id/respond ─────────────────────────
router.post('/:id/respond', protect, requireRoles('department_coordinator', 'faculty', 'staff', 'admin'), async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Response message cannot be empty' });
  }

  try {
    const [[complaint]] = await db.query('SELECT * FROM complaints WHERE complaint_id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    if (['department_coordinator', 'faculty', 'staff'].includes(req.user.role) && complaint.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Access denied: Cannot respond to complaints outside your department' });
    }

    await db.query(
      'INSERT INTO responses (complaint_id, admin_id, message) VALUES (?, ?, ?)',
      [req.params.id, req.user.user_id, message.trim()]
    );

    // Notify student
    const notifMsg = `Official response posted for your grievance #${complaint.complaint_id}: "${complaint.title}"`;
    await db.query(
      'INSERT INTO notifications (user_id, complaint_id, message) VALUES (?, ?, ?)',
      [complaint.user_id, req.params.id, notifMsg]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${complaint.user_id}`).emit('notification', { message: notifMsg });
    }

    res.status(201).json({ message: 'Response posted successfully' });
  } catch (err) {
    console.error('Response error:', err);
    res.status(500).json({ error: 'Failed to post response' });
  }
});

module.exports = router;
