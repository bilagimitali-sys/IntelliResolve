const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const db       = require('../db');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router   = express.Router();

// ─── FILE UPLOAD SETUP ───────────────────────────────────
// BUG FIX: Use __dirname so path is always correct regardless of where node is launched from
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only JPG, PNG, PDF files allowed'));
  }
});

// ─── POST /api/complaints — Submit new complaint ─────────
router.post('/', protect, upload.single('attachment'), async (req, res) => {
  const { title, description, category, priority } = req.body;

  if (!title || !description || !category)
    return res.status(400).json({ error: 'Title, description and category are required' });

  try {
    const attachment = req.file ? req.file.filename : null;
    const [result] = await db.query(
      'INSERT INTO complaints (user_id, title, description, category, priority, attachment) VALUES (?,?,?,?,?,?)',
      [req.user.user_id, title, description, category, priority || 'Low', attachment]
    );

    const complaintId = result.insertId;

    // Notify all admin users
    await db.query(
      'INSERT INTO notifications (user_id, complaint_id, message) SELECT user_id, ?, ? FROM users WHERE role = "admin"',
      [complaintId, `New complaint submitted: "${title}"`]
    );

    res.status(201).json({ message: 'Complaint submitted successfully', complaint_id: complaintId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/complaints — List complaints ───────────────
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'staff';
    let query, params;

    if (isAdmin) {
      const { status, category, priority, search } = req.query;
      let where = 'WHERE 1=1';
      params = [];
      if (status)   { where += ' AND c.status = ?';   params.push(status); }
      if (category) { where += ' AND c.category = ?'; params.push(category); }
      if (priority) { where += ' AND c.priority = ?'; params.push(priority); }
      if (search)   { where += ' AND (c.title LIKE ? OR c.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      query = `SELECT c.*, u.name as student_name, u.email as student_email
               FROM complaints c JOIN users u ON c.user_id = u.user_id
               ${where} ORDER BY c.created_at DESC`;
    } else {
      query  = 'SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC';
      params = [req.user.user_id];
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/complaints/:id — Single complaint detail ───
router.get('/:id', protect, async (req, res) => {
  try {
    const [complaints] = await db.query(
      `SELECT c.*, u.name as student_name, u.email as student_email
       FROM complaints c JOIN users u ON c.user_id = u.user_id
       WHERE c.complaint_id = ?`,
      [req.params.id]
    );
    if (!complaints.length)
      return res.status(404).json({ error: 'Complaint not found' });

    const complaint = complaints[0];

    // Students can only view their own complaints
    if (req.user.role === 'student' && complaint.user_id !== req.user.user_id)
      return res.status(403).json({ error: 'Access denied' });

    const [responses] = await db.query(
      `SELECT r.*, u.name as admin_name FROM responses r
       JOIN users u ON r.admin_id = u.user_id
       WHERE r.complaint_id = ? ORDER BY r.responded_at ASC`,
      [req.params.id]
    );

    res.json({ ...complaint, responses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/complaints/:id/status — Update status ─────
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Pending', 'In Progress', 'Resolved'];
  if (!validStatuses.includes(status))
    return res.status(400).json({ error: 'Invalid status. Must be: Pending, In Progress, or Resolved' });

  try {
    const [updateResult] = await db.query(
      'UPDATE complaints SET status = ? WHERE complaint_id = ?',
      [status, req.params.id]
    );

    if (updateResult.affectedRows === 0)
      return res.status(404).json({ error: 'Complaint not found' });

    // Notify the student
    const [comp] = await db.query(
      'SELECT user_id, title FROM complaints WHERE complaint_id = ?',
      [req.params.id]
    );
    if (comp.length) {
      await db.query(
        'INSERT INTO notifications (user_id, complaint_id, message) VALUES (?,?,?)',
        [comp[0].user_id, req.params.id, `Your complaint "${comp[0].title}" status updated to: ${status}`]
      );

      // Emit real-time notification via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${comp[0].user_id}`).emit('notification', {
          message: `Your complaint "${comp[0].title}" status updated to: ${status}`
        });
      }
    }

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/complaints/:id/respond — Admin response ───
router.post('/:id/respond', protect, adminOnly, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim())
    return res.status(400).json({ error: 'Response message is required' });

  try {
    await db.query(
      'INSERT INTO responses (complaint_id, admin_id, message) VALUES (?,?,?)',
      [req.params.id, req.user.user_id, message.trim()]
    );

    // Notify the student
    const [comp] = await db.query(
      'SELECT user_id, title FROM complaints WHERE complaint_id = ?',
      [req.params.id]
    );
    if (comp.length) {
      await db.query(
        'INSERT INTO notifications (user_id, complaint_id, message) VALUES (?,?,?)',
        [comp[0].user_id, req.params.id, `Admin responded to your complaint: "${comp[0].title}"`]
      );

      // Emit real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${comp[0].user_id}`).emit('notification', {
          message: `Admin responded to your complaint: "${comp[0].title}"`
        });
      }
    }

    res.status(201).json({ message: 'Response posted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
