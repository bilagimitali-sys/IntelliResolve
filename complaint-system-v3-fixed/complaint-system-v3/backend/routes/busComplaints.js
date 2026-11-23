const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const { protect, studentOnly, busCoordinatorOnly } = require('../middleware/authMiddleware');
const router  = express.Router();

// ── FILE UPLOAD (Multer for Bus Grievance Attachments) ────────
const uploadBaseDir = path.join(__dirname, '..', 'uploads');
const busUploadDir  = path.join(uploadBaseDir, 'bus_attachments');
if (!fs.existsSync(uploadBaseDir)) fs.mkdirSync(uploadBaseDir, { recursive: true });
if (!fs.existsSync(busUploadDir))  fs.mkdirSync(busUploadDir,  { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, busUploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Sanitize extension and filename
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `bus-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/i;
    const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk  = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Invalid image format. Only JPG, PNG, and WebP images are allowed.'));
  }
});

// ── GET /api/bus-complaints/buses ────────────────────────────
// Publicly accessible to authenticated users
router.get('/buses', protect, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM buses WHERE is_active = TRUE ORDER BY bus_number ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching buses:', err);
    res.status(500).json({ error: 'Failed to fetch campus buses' });
  }
});

// ── GET /api/bus-complaints/routes ───────────────────────────
router.get('/routes', protect, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM routes WHERE is_active = TRUE ORDER BY route_number ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching routes:', err);
    res.status(500).json({ error: 'Failed to fetch transport routes' });
  }
});

// ── POST /api/bus-complaints (Student Only) ──────────────────
router.post('/', protect, studentOnly, upload.array('attachments', 3), async (req, res) => {
  const {
    bus_id,
    route_id,
    complaint_type,
    title,
    description,
    original_description,
    incident_datetime,
    priority,
    is_safety_hazard,
  } = req.body;

  const validTypes = ['delay', 'driver_behaviour', 'cleanliness', 'maintenance', 'route_issue', 'overcrowding', 'safety'];
  if (!complaint_type || !validTypes.includes(complaint_type)) {
    return res.status(400).json({ error: `Invalid complaint type. Allowed: ${validTypes.join(', ')}` });
  }

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const isSafety = is_safety_hazard === 'true' || is_safety_hazard === true || complaint_type === 'safety' ? 1 : 0;
  const resolvedPriority = isSafety ? 'High' : (priority || 'Medium');

  try {
    const [result] = await db.query(
      `INSERT INTO bus_complaints
         (user_id, bus_id, route_id, complaint_type, title, description, original_description,
          incident_datetime, priority, status, is_safety_hazard)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Received', ?)`,
      [
        req.user.user_id,
        bus_id ? parseInt(bus_id, 10) : null,
        route_id ? parseInt(route_id, 10) : null,
        complaint_type,
        title.trim(),
        description.trim(),
        (original_description || description).trim(),
        incident_datetime ? new Date(incident_datetime) : new Date(),
        resolvedPriority,
        isSafety,
      ]
    );

    const busComplaintId = result.insertId;

    // Save attachments in bus_complaint_attachments
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        await db.query(
          `INSERT INTO bus_complaint_attachments
             (bus_complaint_id, filename, original_name, mime_type, file_size)
           VALUES (?, ?, ?, ?, ?)`,
          [busComplaintId, `bus_attachments/${f.filename}`, f.originalname, f.mimetype, f.size]
        );
      }
    }

    // Insert Audit Log entry
    await db.query(
      `INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, new_status, notes)
       VALUES (?, ?, 'CREATED', 'Received', 'Grievance submitted by student')`,
      [busComplaintId, req.user.user_id]
    );

    // In-app notifications for Bus Coordinators & Admins
    const notifText = `${isSafety ? '🚨 SAFETY ALERT: ' : ''}New Bus Complaint #${busComplaintId} [${complaint_type.toUpperCase()}]: "${title}"`;
    await db.query(
      `INSERT INTO notifications (user_id, complaint_id, message)
       SELECT user_id, 0, ? FROM users WHERE role IN ('bus_coordinator', 'admin')`,
      [notifText]
    );

    // Socket.io real-time push
    const io = req.app.get('io');
    if (io) {
      io.to('role_bus_coordinator').to('role_admin').emit('newBusComplaint', {
        bus_complaint_id: busComplaintId,
        title,
        complaint_type,
        priority: resolvedPriority,
        is_safety_hazard: isSafety,
        submitted_at: new Date(),
      });
    }

    res.status(201).json({
      message: 'Bus complaint registered successfully',
      bus_complaint_id: busComplaintId,
    });
  } catch (err) {
    console.error('Bus complaint creation error:', err);
    res.status(500).json({ error: 'Failed to submit bus complaint' });
  }
});

// ── GET /api/bus-complaints ──────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { role, user_id } = req.user;

    // Department coordinators are strictly forbidden from bus complaints
    if (role === 'department_coordinator' || role === 'faculty') {
      return res.status(403).json({ error: 'Access denied: Department coordinators cannot access transportation complaints' });
    }

    const { status, complaint_type, priority, bus_id, route_id, search, safety_only } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (role === 'student') {
      where += ' AND bc.user_id = ?';
      params.push(user_id);
    }

    if (status) {
      where += ' AND bc.status = ?';
      params.push(status);
    }
    if (complaint_type) {
      where += ' AND bc.complaint_type = ?';
      params.push(complaint_type);
    }
    if (priority) {
      where += ' AND bc.priority = ?';
      params.push(priority);
    }
    if (bus_id) {
      where += ' AND bc.bus_id = ?';
      params.push(bus_id);
    }
    if (route_id) {
      where += ' AND bc.route_id = ?';
      params.push(route_id);
    }
    if (safety_only === 'true' || safety_only === '1') {
      where += ' AND bc.is_safety_hazard = 1';
    }
    if (search) {
      where += ' AND (bc.title LIKE ? OR bc.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await db.query(
      `SELECT bc.*,
              u.name AS student_name, u.email AS student_email,
              b.bus_number, b.driver_name, b.driver_phone,
              r.route_number, r.route_name,
              assignee.name AS assigned_to_name
       FROM bus_complaints bc
       JOIN users u ON bc.user_id = u.user_id
       LEFT JOIN buses b ON bc.bus_id = b.bus_id
       LEFT JOIN routes r ON bc.route_id = r.route_id
       LEFT JOIN users assignee ON bc.assigned_to = assignee.user_id
       ${where}
       ORDER BY bc.is_safety_hazard DESC, bc.created_at DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Error fetching bus complaints:', err);
    res.status(500).json({ error: 'Failed to fetch bus complaints' });
  }
});

// ── GET /api/bus-complaints/:id ──────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const { role, user_id } = req.user;

    if (role === 'department_coordinator' || role === 'faculty') {
      return res.status(403).json({ error: 'Access denied: Department coordinators cannot access transportation complaints' });
    }

    const [complaints] = await db.query(
      `SELECT bc.*,
              u.name AS student_name, u.email AS student_email,
              b.bus_number, b.driver_name, b.driver_phone, b.capacity,
              r.route_number, r.route_name, r.start_point, r.end_point, r.stops_list,
              assignee.name AS assigned_to_name
       FROM bus_complaints bc
       JOIN users u ON bc.user_id = u.user_id
       LEFT JOIN buses b ON bc.bus_id = b.bus_id
       LEFT JOIN routes r ON bc.route_id = r.route_id
       LEFT JOIN users assignee ON bc.assigned_to = assignee.user_id
       WHERE bc.bus_complaint_id = ?`,
      [req.params.id]
    );

    if (!complaints.length) return res.status(404).json({ error: 'Bus complaint not found' });
    const complaint = complaints[0];

    if (role === 'student' && complaint.user_id !== user_id) {
      return res.status(403).json({ error: 'Access denied to this complaint' });
    }

    // Fetch attachments
    const [attachments] = await db.query(
      'SELECT * FROM bus_complaint_attachments WHERE bus_complaint_id = ?',
      [req.params.id]
    );

    // Fetch responses
    const [responses] = await db.query(
      `SELECT r.*, u.name AS user_name, u.role AS user_role
       FROM bus_complaint_responses r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.bus_complaint_id = ?
       ORDER BY r.responded_at ASC`,
      [req.params.id]
    );

    // Fetch audit log
    const [auditLog] = await db.query(
      `SELECT l.*, u.name AS actor_name, u.role AS actor_role
       FROM bus_complaint_audit_log l
       JOIN users u ON l.actor_id = u.user_id
       WHERE l.bus_complaint_id = ?
       ORDER BY l.created_at ASC`,
      [req.params.id]
    );

    res.json({
      ...complaint,
      attachments,
      responses,
      auditLog,
    });
  } catch (err) {
    console.error('Error fetching bus complaint details:', err);
    res.status(500).json({ error: 'Failed to retrieve bus complaint details' });
  }
});

// ── PUT /api/bus-complaints/:id/status ───────────────────────
// Workflow: Received → Under Review → Assigned → In Progress → Resolved (or Escalated)
router.put('/:id/status', protect, busCoordinatorOnly, async (req, res) => {
  const { status, remarks } = req.body;
  const valid = ['Received', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Escalated'];
  if (!status || !valid.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${valid.join(', ')}` });
  }

  try {
    const [[existing]] = await db.query('SELECT * FROM bus_complaints WHERE bus_complaint_id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Bus complaint not found' });

    await db.query(
      'UPDATE bus_complaints SET status = ? WHERE bus_complaint_id = ?',
      [status, req.params.id]
    );

    // Audit log
    await db.query(
      `INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, old_status, new_status, notes)
       VALUES (?, ?, 'STATUS_UPDATE', ?, ?, ?)`,
      [req.params.id, req.user.user_id, existing.status, status, remarks || `Status moved to ${status}`]
    );

    // Notify student
    const notifMsg = `Your bus complaint #${req.params.id} status updated to: ${status}`;
    await db.query(
      'INSERT INTO notifications (user_id, complaint_id, message) VALUES (?, 0, ?)',
      [existing.user_id, notifMsg]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${existing.user_id}`).emit('notification', { message: notifMsg });
    }

    res.json({ message: 'Bus complaint status updated successfully' });
  } catch (err) {
    console.error('Error updating bus complaint status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ── POST /api/bus-complaints/:id/assign ──────────────────────
router.put('/:id/assign', protect, busCoordinatorOnly, async (req, res) => {
  const { assigned_to, remarks } = req.body;

  try {
    const [[existing]] = await db.query('SELECT * FROM bus_complaints WHERE bus_complaint_id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Bus complaint not found' });

    await db.query(
      `UPDATE bus_complaints
       SET assigned_to = ?, status = 'Assigned'
       WHERE bus_complaint_id = ?`,
      [assigned_to || req.user.user_id, req.params.id]
    );

    await db.query(
      `INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, old_status, new_status, notes)
       VALUES (?, ?, 'ASSIGNED', ?, 'Assigned', ?)`,
      [req.params.id, req.user.user_id, existing.status, remarks || 'Assigned to coordinator']
    );

    res.json({ message: 'Complaint assigned successfully' });
  } catch (err) {
    console.error('Assign error:', err);
    res.status(500).json({ error: 'Failed to assign complaint' });
  }
});

// ── POST /api/bus-complaints/:id/escalate ────────────────────
router.post('/:id/escalate', protect, busCoordinatorOnly, async (req, res) => {
  const { escalation_reason } = req.body;
  if (!escalation_reason || !escalation_reason.trim()) {
    return res.status(400).json({ error: 'A clear escalation reason is mandatory' });
  }

  try {
    const [[existing]] = await db.query('SELECT * FROM bus_complaints WHERE bus_complaint_id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Bus complaint not found' });

    await db.query(
      `UPDATE bus_complaints
       SET status = 'Escalated', escalation_reason = ?, escalated_at = NOW()
       WHERE bus_complaint_id = ?`,
      [escalation_reason.trim(), req.params.id]
    );

    await db.query(
      `INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, old_status, new_status, notes)
       VALUES (?, ?, 'ESCALATED', ?, 'Escalated', ?)`,
      [req.params.id, req.user.user_id, existing.status, escalation_reason.trim()]
    );

    // Notify all admin users
    const alertMsg = `⚠️ ESCALATION: Bus Complaint #${req.params.id} escalated to Admin: "${escalation_reason.trim().substring(0, 100)}"`;
    await db.query(
      `INSERT INTO notifications (user_id, complaint_id, message)
       SELECT user_id, 0, ? FROM users WHERE role = 'admin'`,
      [alertMsg]
    );

    const io = req.app.get('io');
    if (io) {
      io.to('role_admin').emit('newEscalation', {
        bus_complaint_id: req.params.id,
        reason: escalation_reason.trim(),
        escalated_by: req.user.name,
      });
    }

    res.json({ message: 'Grievance escalated to University Administration successfully' });
  } catch (err) {
    console.error('Escalation error:', err);
    res.status(500).json({ error: 'Failed to escalate complaint' });
  }
});

// ── POST /api/bus-complaints/:id/respond ─────────────────────
router.post('/:id/respond', protect, busCoordinatorOnly, async (req, res) => {
  const { message, is_internal } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Response message cannot be empty' });
  }

  try {
    const [[existing]] = await db.query('SELECT * FROM bus_complaints WHERE bus_complaint_id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Bus complaint not found' });

    await db.query(
      `INSERT INTO bus_complaint_responses (bus_complaint_id, user_id, message, is_internal)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, req.user.user_id, message.trim(), is_internal ? 1 : 0]
    );

    await db.query(
      `INSERT INTO bus_complaint_audit_log (bus_complaint_id, actor_id, action, notes)
       VALUES (?, ?, 'REPLIED', ?)`,
      [req.params.id, req.user.user_id, is_internal ? 'Added internal coordinator note' : 'Sent official response to student']
    );

    if (!is_internal) {
      const notifMsg = `Response received on your bus complaint #${req.params.id}`;
      await db.query(
        'INSERT INTO notifications (user_id, complaint_id, message) VALUES (?, 0, ?)',
        [existing.user_id, notifMsg]
      );

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${existing.user_id}`).emit('notification', { message: notifMsg });
      }
    }

    res.status(201).json({ message: 'Response posted successfully' });
  } catch (err) {
    console.error('Response error:', err);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

module.exports = router;
