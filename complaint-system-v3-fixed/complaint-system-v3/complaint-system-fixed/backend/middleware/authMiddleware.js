const jwt = require('jsonwebtoken');

// Protect any route — requires valid JWT
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Restrict to admin role only
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'staff')
    return res.status(403).json({ error: 'Access denied: Admins only' });
  next();
};

module.exports = { protect, adminOnly };
