const express = require('express');
const db      = require('../db');
const { protect, adminOnly, adminOrFaculty } = require('../middleware/authMiddleware');
const router  = express.Router();

// ── GET /api/departments ─────────────────────────────────────
// Public for authenticated users — used by the department selector
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM departments ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/departments/:id ─────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM departments WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Department not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/departments/:id/complaints ──────────────────────
// Faculty view: complaints routed to a specific department
router.get('/:id/complaints', protect, adminOrFaculty, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name AS student_name, u.email AS student_email
       FROM complaints c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.department_id = ?
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
