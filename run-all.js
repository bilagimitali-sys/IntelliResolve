const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function findDirs() {
  const candidates = [
    { backend: path.join(__dirname, 'complaint-system-v3-fixed', 'complaint-system-v3', 'backend'), frontend: path.join(__dirname, 'complaint-system-v3-fixed', 'complaint-system-v3', 'frontend') },
    { backend: path.join(__dirname, 'backend'), frontend: path.join(__dirname, 'frontend') },
    { backend: path.join(__dirname, '..', 'backend'), frontend: path.join(__dirname, '..', 'frontend') },
    { backend: path.resolve('complaint-system-v3-fixed/complaint-system-v3/backend'), frontend: path.resolve('complaint-system-v3-fixed/complaint-system-v3/frontend') },
    { backend: path.resolve('../backend'), frontend: path.resolve('../frontend') },
    { backend: path.resolve('backend'), frontend: path.resolve('frontend') },
  ];

  for (const c of candidates) {
    if (fs.existsSync(path.join(c.backend, 'main.py')) && fs.existsSync(path.join(c.frontend, 'package.json'))) {
      return c;
    }
  }
  return null;
}

const dirs = findDirs();
if (!dirs) {
  console.error('❌ Could not locate backend and frontend directories.');
  process.exit(1);
}

console.log('\n============================================================');
console.log('🏛️  KLE TECHNOLOGICAL UNIVERSITY — GRIEVANCE PLATFORM');
console.log('🚀 Starting Python FastAPI Backend & Frontend React App...');
console.log(`📁 Backend:  ${dirs.backend}`);
console.log(`📁 Frontend: ${dirs.frontend}`);
console.log('============================================================\n');

// 1. Start Python FastAPI Backend Server
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
const backend = spawn(pythonCmd, ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '5000'], {
  cwd: dirs.backend,
  env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`[Backend]  ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`[Backend Error] ${data}`);
});

// 2. Start Frontend React Server
const frontend = process.platform === 'win32'
  ? spawn('cmd.exe', ['/c', 'npm', 'start'], {
      cwd: dirs.frontend,
      env: { ...process.env, BROWSER: 'none', FORCE_COLOR: 'true' },
    })
  : spawn('npm', ['start'], {
      cwd: dirs.frontend,
      env: { ...process.env, BROWSER: 'none', FORCE_COLOR: 'true' },
    });

frontend.stdout.on('data', (data) => {
  process.stdout.write(`[Frontend] ${data}`);
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`[Frontend] ${data}`);
});

function cleanup() {
  console.log('\nShutting down KLE Grievance Platform servers...');
  backend.kill();
  frontend.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
