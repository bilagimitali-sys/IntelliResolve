const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router  = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'kle_tech_grievance_platform_super_secret_key_2025';

// ── POST /api/auth/register ──────────────────────────────────
// Self-registration for students
router.post('/register', async (req, res) => {
  const { name, email, password, role, department, department_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Prevent self-registration for coordinators or admin
  if (['admin', 'bus_coordinator', 'department_coordinator', 'staff'].includes(role)) {
    return res.status(403).json({
      error: 'Administrative and coordinator accounts can only be provisioned by System Administrators.'
    });
  }

  const safeRole = role === 'faculty' ? 'faculty' : 'student';

  try {
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const hash = await bcrypt.hash(password, 10);

    let resolvedDeptId = department_id || null;
    let resolvedDeptName = department || null;

    if (resolvedDeptId && !resolvedDeptName) {
      const [[d]] = await db.query('SELECT name FROM departments WHERE id = ?', [resolvedDeptId]);
      if (d) resolvedDeptName = d.name;
    } else if (resolvedDeptName && !resolvedDeptId) {
      const [[d]] = await db.query('SELECT id FROM departments WHERE name = ? OR code = ?', [resolvedDeptName, resolvedDeptName]);
      if (d) resolvedDeptId = d.id;
    }

    await db.query(
      `INSERT INTO users (name, email, password, role, department, department_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [name.trim(), email.trim().toLowerCase(), hash, safeRole, resolvedDeptName, resolvedDeptId]
    );

    res.status(201).json({ message: 'Account created successfully. Please log in.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query(
      `SELECT u.*, d.name AS dept_name, d.code AS dept_code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled. Please contact System Administrator.' });
    }

    const tokenPayload = {
      user_id: user.user_id,
      role: user.role,
      name: user.name,
      email: user.email,
      department: user.department || user.dept_name,
      department_id: user.department_id,
      department_code: user.dept_code,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: tokenPayload,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during authentication' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.name, u.email, u.role, u.department, u.department_id,
              d.name AS department_name, d.code AS department_code, d.icon AS department_icon,
              u.created_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// ── ADMIN: Coordinator & User Management Endpoints ───────────

// POST /api/auth/admin/coordinators OR POST /api/admin/coordinators
router.post(['/admin/coordinators', '/coordinators', '/admin/create-staff', '/create-staff'], protect, adminOnly, async (req, res) => {
  const { name, email, password, role, department_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, temporary password, and role are required' });
  }

  if (!['department_coordinator', 'bus_coordinator', 'staff', 'faculty'].includes(role)) {
    return res.status(400).json({ error: 'Invalid coordinator role selected' });
  }

  if (role === 'department_coordinator' && !department_id) {
    return res.status(400).json({ error: 'Please select a department for the Department Coordinator' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    let deptName = null;
    if (department_id) {
      const [[d]] = await db.query('SELECT name FROM departments WHERE id = ?', [department_id]);
      if (d) deptName = d.name;
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, department, department_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [name.trim(), email.trim().toLowerCase(), hash, role, deptName, department_id || null]
    );

    res.status(201).json({
      message: 'Coordinator account created successfully.',
      user_id: result.insertId,
    });
  } catch (err) {
    console.error('Error creating coordinator:', err);
    res.status(500).json({ error: 'Server error while creating coordinator' });
  }
});

// GET /api/auth/admin/users OR GET /api/admin/users
router.get(['/admin/users', '/users'], protect, adminOnly, async (req, res) => {
  try {
    const { role, search } = req.query;
    let sql = `
      SELECT u.user_id, u.name, u.email, u.role, u.department, u.department_id,
             d.name AS department_name, d.code AS department_code, u.is_active, u.created_at
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }
    if (search) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.department LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY u.created_at DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/auth/admin/users/:id/status
router.put(['/admin/users/:id/status', '/users/:id/status'], protect, adminOnly, async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active boolean is required' });
  }

  try {
    await db.query('UPDATE users SET is_active = ? WHERE user_id = ?', [is_active, req.params.id]);
    res.json({ message: `User account has been ${is_active ? 'activated' : 'disabled'}` });
  } catch (err) {
    console.error('Error toggling user status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

module.exports = router;
