const express = require('express');
const db      = require('../db');
const { protect } = require('../middleware/authMiddleware');
const router  = express.Router();

// ── GET /api/analytics ───────────────────────────────────────
// Comprehensive analytics for Admin, Department Coordinators, and Bus Coordinators
router.get('/', protect, async (req, res) => {
  const { role, department_id } = req.user;

  try {
    // ── 1. DEPARTMENT COMPLAINTS AGGREGATIONS ──
    let deptWhere = 'WHERE 1=1';
    const deptParams = [];
    if (['department_coordinator', 'faculty', 'staff'].includes(role) && department_id) {
      deptWhere += ' AND department_id = ?';
      deptParams.push(department_id);
    }

    const [[deptTotals]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'Pending') as pending,
        SUM(status = 'In Progress') as in_progress,
        SUM(status = 'Resolved') as resolved,
        SUM(is_safety_hazard = 1) as safety_hazards
      FROM complaints
      ${deptWhere}
    `, deptParams);

    // By category
    const [byCategory] = await db.query(`
      SELECT category, COUNT(*) as count
      FROM complaints
      ${deptWhere}
      GROUP BY category
      ORDER BY count DESC
    `, deptParams);

    // By priority
    const [byPriority] = await db.query(`
      SELECT priority, COUNT(*) as count
      FROM complaints
      ${deptWhere}
      GROUP BY priority
    `, deptParams);

    // Average resolution time (days)
    const [[avgTime]] = await db.query(`
      SELECT ROUND(AVG(DATEDIFF(updated_at, created_at)), 1) as avg_days
      FROM complaints
      ${deptWhere} AND status = 'Resolved'
    `, deptParams);

    // Department hotspots (Admin only)
    let byDepartment = [];
    if (role === 'admin') {
      const [deptRows] = await db.query(`
        SELECT d.id, d.name, d.code, d.icon, COUNT(c.complaint_id) as total_complaints,
               SUM(c.status = 'Resolved') as resolved_complaints
        FROM departments d
        LEFT JOIN complaints c ON d.id = c.department_id
        GROUP BY d.id, d.name, d.code, d.icon
        ORDER BY total_complaints DESC
      `);
      byDepartment = deptRows;
    }

    // ── 2. TRANSPORTATION (BUS) COMPLAINTS AGGREGATIONS ──
    const [[busTotals]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'Received') as received,
        SUM(status = 'Under Review') as under_review,
        SUM(status = 'Assigned') as assigned,
        SUM(status = 'In Progress') as in_progress,
        SUM(status = 'Resolved') as resolved,
        SUM(status = 'Escalated') as escalated,
        SUM(is_safety_hazard = 1) as safety_hazards
      FROM bus_complaints
    `);

    // Bus complaints by type
    const [byBusType] = await db.query(`
      SELECT complaint_type, COUNT(*) as count
      FROM bus_complaints
      GROUP BY complaint_type
      ORDER BY count DESC
    `);

    // Route Hotspots (highest issues)
    const [routeHotspots] = await db.query(`
      SELECT r.route_id, r.route_number, r.route_name, COUNT(bc.bus_complaint_id) as complaint_count,
             SUM(bc.is_safety_hazard = 1) as safety_count
      FROM routes r
      LEFT JOIN bus_complaints bc ON r.route_id = bc.route_id
      GROUP BY r.route_id, r.route_number, r.route_name
      ORDER BY complaint_count DESC
    `);

    // ── 3. MONTHLY TIMELINE TREND (Last 6 Months) ──
    const [monthlyDept] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%b %Y') as month,
        COUNT(*) as total,
        SUM(status = 'Resolved') as resolved
      FROM complaints
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      ${deptWhere.replace('WHERE 1=1', '')}
      GROUP BY DATE_FORMAT(created_at, '%b %Y'), YEAR(created_at), MONTH(created_at)
      ORDER BY YEAR(created_at), MONTH(created_at)
    `, deptParams);

    res.json({
      role,
      department: {
        totals: deptTotals,
        byCategory,
        byPriority,
        avgResolutionDays: avgTime?.avg_days || 0,
        byDepartment,
        monthly: monthlyDept,
      },
      transport: {
        totals: busTotals,
        byType: byBusType,
        routeHotspots,
      },
      overall_safety_alerts: (Number(deptTotals?.safety_hazards) || 0) + (Number(busTotals?.safety_hazards) || 0),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

module.exports = router;
