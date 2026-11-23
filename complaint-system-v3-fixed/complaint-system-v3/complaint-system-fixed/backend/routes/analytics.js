const express = require('express');
const db      = require('../db');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router  = express.Router();

// ─── GET /api/analytics — Admin analytics ────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    // Total counts
    const [[totals]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'Pending') as pending,
        SUM(status = 'In Progress') as in_progress,
        SUM(status = 'Resolved') as resolved
      FROM complaints
    `);

    // By category
    const [byCategory] = await db.query(`
      SELECT category, COUNT(*) as count FROM complaints GROUP BY category
    `);

    // By priority
    const [byPriority] = await db.query(`
      SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority
    `);

    // Monthly trend (last 6 months)
    const [monthly] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%b %Y') as month,
        COUNT(*) as total,
        SUM(status = 'Resolved') as resolved
      FROM complaints
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%b %Y'), YEAR(created_at), MONTH(created_at)
      ORDER BY YEAR(created_at), MONTH(created_at)
    `);

    // Avg resolution time (days)
    const [[avgTime]] = await db.query(`
      SELECT ROUND(AVG(DATEDIFF(updated_at, created_at)), 1) as avg_days
      FROM complaints WHERE status = 'Resolved'
    `);

    // Recent complaints
    const [recent] = await db.query(`
      SELECT c.complaint_id, c.title, c.status, c.priority, c.created_at, u.name as student_name
      FROM complaints c JOIN users u ON c.user_id = u.user_id
      ORDER BY c.created_at DESC LIMIT 5
    `);

    res.json({
      totals,
      byCategory,
      byPriority,
      monthly,
      avgResolutionDays: avgTime.avg_days || 0,
      recent
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
