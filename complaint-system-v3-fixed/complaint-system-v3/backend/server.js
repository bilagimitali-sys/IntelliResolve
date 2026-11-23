const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app    = express();
const server = http.createServer(app);

// ── SOCKET.IO INITIALIZATION ─────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:  process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT'],
  },
});

io.on('connection', (socket) => {
  // Client joins personal notification room
  socket.on('join', (userId) => {
    if (userId) socket.join(`user_${userId}`);
  });

  // Client joins role-based room
  socket.on('joinRole', (role) => {
    if (role) socket.join(`role_${role}`);
  });

  // Department Coordinator joins their specific department channel
  socket.on('joinDept', (deptId) => {
    if (deptId) socket.join(`dept_${deptId}`);
  });

  socket.on('disconnect', () => {});
});

app.set('io', io);

// ── MIDDLEWARE ───────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── STATIC UPLOADS DIRECTORIES ───────────────────────────────
const uploadDir    = path.join(__dirname, 'uploads');
const voiceDir     = path.join(uploadDir, 'voice');
const busUploadDir = path.join(uploadDir, 'bus_attachments');

if (!fs.existsSync(uploadDir))    fs.mkdirSync(uploadDir,    { recursive: true });
if (!fs.existsSync(voiceDir))     fs.mkdirSync(voiceDir,     { recursive: true });
if (!fs.existsSync(busUploadDir)) fs.mkdirSync(busUploadDir, { recursive: true });

app.use('/uploads', express.static(uploadDir));

// ── API ROUTES ───────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/admin',          require('./routes/auth'));
app.use('/api/complaints',     require('./routes/complaints'));
app.use('/api/bus-complaints', require('./routes/busComplaints'));
app.use('/api/ai',             require('./routes/ai'));
app.use('/api/notifications',  require('./routes/notifications'));
app.use('/api/analytics',      require('./routes/analytics'));
app.use('/api/departments',    require('./routes/departments'));

// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    system: 'KLE Tech Grievance Platform v4',
    timestamp: new Date(),
  });
});

// ── 404 HANDLER ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ── START SERVER ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`🏛️  KLE Technological University — Grievance Management Platform`);
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📁 Upload storage: http://localhost:${PORT}/uploads`);
  console.log(`🔌 Socket.IO initialized (rooms: user_*, role_*, dept_*)`);
  console.log(`====================================================\n`);
});
