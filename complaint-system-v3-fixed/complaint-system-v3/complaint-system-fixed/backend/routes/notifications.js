const express = require('express');
const db      = require('../db');
const { protect } = require('../middleware/authMiddleware');
const router  = express.Router();

// ─── GET /api/notifications ───────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.*, c.title as complaint_title FROM notifications n
       JOIN complaints c ON n.complaint_id = c.complaint_id
       WHERE n.user_id = ? ORDER BY n.sent_at DESC LIMIT 20`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// BUG FIX: /read-all/all MUST come before /:id/read
// Otherwise Express matches 'read-all' as the :id param
router.put('/read-all/all', protect, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.user_id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/notifications/:id/read ─────────────────────
router.put('/:id/read', protect, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE notif_id = ? AND user_id = ?',
      [req.params.id, req.user.user_id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
