const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const electronBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron',
);
const devUrl = 'http://127.0.0.1:1420/';

let viteProcess;
let electronProcess;
let shuttingDown = false;

// Bug 3 Fix: Handle EPIPE on the dev runner process
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') return;
  console.error(err);
});
process.stderr.on('error', (err) => {
  if (err.code === 'EPIPE') return;
  console.error(err);
});

function quoteForCmd(value) {
  if (!/[()\s&|<>^"]/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function spawnCommand(command, args, options) {
  if (process.platform !== 'win32') {
    return spawn(command, args, { ...options, shell: false });
  }

  const commandLine = [command, ...args].map(quoteForCmd).join(' ');
  return spawn('cmd.exe', ['/d', '/s', '/c', commandLine], {
    ...options,
    shell: false,
  });
}

function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(check, 250);
      });

      request.setTimeout(1000, () => {
        request.destroy();
      });
    };

    check();
  });
}

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (electronProcess && !electronProcess.killed) {
    try {
      electronProcess.kill();
    } catch (e) {}
  }

  if (viteProcess && !viteProcess.killed) {
    try {
      viteProcess.kill();
    } catch (e) {}
  }

  process.exit(exitCode);
}

async function main() {
  console.log('[Dev] Starting Vite server...');
  
  viteProcess = spawnCommand(npmBin, ['run', 'dev', '--', '--host', '127.0.0.1'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  viteProcess.on('exit', (code) => {
    if (!shuttingDown) {
      stopAll(code || 0);
    }
  });

  try {
    await waitForServer(devUrl);
    console.log('[Dev] Vite server ready, launching Electron...');
  } catch (err) {
    console.error(err.message);
    stopAll(1);
    return;
  }

  electronProcess = spawnCommand(electronBin, ['electron/main.cjs'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devUrl,
    },
  });

  electronProcess.on('exit', (code) => {
    if (!shuttingDown) {
      stopAll(code || 0);
    }
  });
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

main().catch((error) => {
  console.error(error);
  stopAll(1);
});
