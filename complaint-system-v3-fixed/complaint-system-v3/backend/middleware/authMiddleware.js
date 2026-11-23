const jwt = require('jsonwebtoken');

// ── protect ─────────────────────────────────────────────────
// Validates JWT; attaches decoded payload to req.user
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // Payload shape: { user_id, role, name, email, department, department_id }
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'kle_tech_grievance_platform_super_secret_key_2025');
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── requireRoles(...allowedRoles) ───────────────────────────
// Strict allow-list based role guard
const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Access denied. Authorized roles: ${allowedRoles.join(', ')} (Your role: ${req.user?.role || 'none'})`
    });
  }
  next();
};

// ── Role specific shortcuts ─────────────────────────────────
const adminOnly = requireRoles('admin');
const studentOnly = requireRoles('student');
const busCoordinatorOnly = requireRoles('bus_coordinator', 'admin');
const deptCoordinatorOnly = requireRoles('department_coordinator', 'faculty', 'staff', 'admin');

// Backward compatibility helper
const adminOrFaculty = requireRoles('admin', 'staff', 'faculty', 'department_coordinator');
const roleGuard = requireRoles;

module.exports = {
  protect,
  requireRoles,
  adminOnly,
  studentOnly,
  busCoordinatorOnly,
  deptCoordinatorOnly,
  adminOrFaculty,
  roleGuard,
};
