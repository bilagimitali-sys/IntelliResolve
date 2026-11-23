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
    if (fs.existsSync(path.join(c.backend, 'server.js')) && fs.existsSync(path.join(c.frontend, 'package.json'))) {
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
console.log('🚀 Starting Backend API & Frontend React App simultaneously...');
console.log(`📁 Backend:  ${dirs.backend}`);
console.log(`📁 Frontend: ${dirs.frontend}`);
console.log('============================================================\n');

// 1. Start Backend Server
const backend = spawn('node', ['server.js'], {
  cwd: dirs.backend,
  shell: true,
  env: { ...process.env, FORCE_COLOR: 'true' },
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`[Backend]  ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`[Backend Error] ${data}`);
});

// 2. Start Frontend React Server
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontend = spawn(npmCmd, ['start'], {
  cwd: dirs.frontend,
  shell: true,
  env: { ...process.env, BROWSER: 'none', FORCE_COLOR: 'true' }, // prevents duplicate browser auto-open spam if already open
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
