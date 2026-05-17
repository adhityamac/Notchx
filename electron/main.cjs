const { app, BrowserWindow, globalShortcut, ipcMain, powerMonitor, screen } = require('electron');
const path = require('path');
const si = require('systeminformation');

process.stdout.on('error', (e) => { if (e.code !== 'EPIPE') console.error(e); });
process.stderr.on('error', (e) => { if (e.code !== 'EPIPE') console.error(e); });
function safeLog(...a) { try { console.log(...a); } catch { } }

// ── Constants ─────────────────────────────────────────────────────────────
// Idle pill 180×44px + 40px glow buffer each side → initial window 220×96
const IDLE_W = 220;  // pill(180) + 40 glow buffer
const IDLE_H = 96;   // 12(top-offset) + 44(pill) + 40(shadow+spring room)
const POLL = 30_000;

// ── Persistent state ──────────────────────────────────────────────────────
// Stored in memory so overlay:resize can recalc x/y without being told each time.
// Presets: 'top-center' | 'top-left' | 'top-right' | 'custom'
let activePreset = 'top-center';

let notchWindow = null;
let simWindow = null;
let batteryInterval = null;
let cachedBattery = { percentage: 100, is_charging: false };
let clickThrough = false;

app.disableHardwareAcceleration();

// ── Helpers ───────────────────────────────────────────────────────────────
function rendererUrl(type = 'notch') {
  const base = process.env.VITE_DEV_SERVER_URL
    || `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;
  return `${base}${base.includes('?') ? '&' : '?'}window=${type}`;
}

/**
 * Calculate the notch window x position for a given preset + window width.
 * Uses native screen.getPrimaryDisplay().bounds so it is always accurate,
 * regardless of what the renderer reports for screen dimensions.
 */
function calcX(preset, windowWidth) {
  const { bounds } = screen.getPrimaryDisplay();
  switch (preset) {
    case 'top-left': return bounds.x + 16;
    case 'top-right': return bounds.x + bounds.width - windowWidth - 16;
    case 'top-center':
    default: return bounds.x + Math.floor((bounds.width - windowWidth) / 2);
  }
}

// ── Notch window ──────────────────────────────────────────────────────────
function createNotchWindow() {
  if (notchWindow) return;

  const { bounds } = screen.getPrimaryDisplay();
  const x = calcX(activePreset, IDLE_W);
  const y = bounds.y; // always 0

  safeLog(`[Main] Notch x=${x} y=${y} display=${bounds.width}×${bounds.height}`);

  notchWindow = new BrowserWindow({
    width: IDLE_W, height: IDLE_H, x, y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    // resizable:true is required on Windows — resizable:false causes setBounds()
    // to silently ignore width/height changes. frame:false hides resize handles.
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    title: 'NotchX',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  notchWindow.setMenuBarVisibility(false);
  notchWindow.setAlwaysOnTop(true, 'screen-saver');
  notchWindow.loadURL(rendererUrl('notch'));
  notchWindow.on('closed', () => { notchWindow = null; });
}

// ── Simulator window ──────────────────────────────────────────────────────
function createSimWindow() {
  if (simWindow) { simWindow.show(); simWindow.focus(); return; }

  const { bounds } = screen.getPrimaryDisplay();
  simWindow = new BrowserWindow({
    width: 320, height: 640,
    x: bounds.x + bounds.width - 320 - 16,
    y: bounds.y + 60,
    title: 'Island Simulator',
    frame: true,
    autoHideMenuBar: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  simWindow.loadURL(rendererUrl('settings'));
  simWindow.once('ready-to-show', () => simWindow?.show());
  simWindow.on('closed', () => { simWindow = null; });
}

// ── Battery ───────────────────────────────────────────────────────────────
async function readBattery() {
  try {
    const d = await si.battery();
    if (!d || !d.hasBattery) return { percentage: 100, is_charging: true };
    return { percentage: Math.round(d.percent ?? 100), is_charging: d.isCharging ?? false };
  } catch { return cachedBattery; }
}

async function pushBattery() {
  const p = await readBattery();
  cachedBattery = p;
  [notchWindow, simWindow].forEach(w => {
    if (w && !w.isDestroyed()) try { w.webContents.send('battery-update', p); } catch { }
  });
}

// ── Hardware Monitoring ───────────────────────────────────────────────────
let hardwareInterval = null;
async function pushSystemStats() {
  try {
    const mem = await si.mem();
    const load = await si.currentLoad();
    
    const stats = {
      cpuUsage: Math.round(load.currentLoad),
      ramUsage: Math.round((mem.active / mem.total) * 100),
      totalMemStr: (mem.total / 1024 / 1024 / 1024).toFixed(1) + 'GB'
    };
    
    [notchWindow, simWindow].forEach(w => {
      if (w && !w.isDestroyed()) try { w.webContents.send('system-stats-update', stats); } catch { }
    });
  } catch(e) {}
}

// ── Shortcuts ─────────────────────────────────────────────────────────────
function registerShortcuts() {
  [
    ['MediaPlayPause', 'play-pause'],
    ['MediaNextTrack', 'next-track'],
    ['MediaPreviousTrack', 'prev-track'],
  ].forEach(([acc, key]) => {
    try {
      globalShortcut.register(acc, () => {
        if (notchWindow && !notchWindow.isDestroyed())
          notchWindow.webContents.send('media-key', key);
      });
    } catch { }
  });

  try {
    globalShortcut.register('Control+Shift+I', () => {
      if (!simWindow || simWindow.isDestroyed()) createSimWindow();
      else if (simWindow.isFocused()) simWindow.hide();
      else { simWindow.show(); simWindow.focus(); }
    });
    safeLog('[Main] Ctrl+Shift+I → Toggle Simulator');
  } catch (e) { safeLog('[Main] Shortcut failed:', e.message); }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on('second-instance', () => { simWindow ? simWindow.focus() : createSimWindow(); });

  app.whenReady().then(() => {
    createNotchWindow();
    createSimWindow();
    registerShortcuts();
    pushBattery();
    batteryInterval = setInterval(pushBattery, POLL);
    powerMonitor.on('on-ac', pushBattery);
    powerMonitor.on('on-battery', pushBattery);
    
    hardwareInterval = setInterval(pushSystemStats, 2000);
    pushSystemStats();
  });
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createNotchWindow();
});
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  clearInterval(batteryInterval);
  clearInterval(hardwareInterval);
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ═══════════════════════════════════════════════════════════════════════════
// IPC HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

// ── overlay:alignWindow ───────────────────────────────────────────────────
// Called once when the user picks a preset (Top Center / Top Left / Top Right).
// Stores the preset, then atomically repositions the window at its current size.
ipcMain.handle('overlay:alignWindow', (_e, { preset, width }) => {
  if (!notchWindow || notchWindow.isDestroyed()) return;

  // 1. Persist the preset so future resize calls honour it automatically
  if (['top-center', 'top-left', 'top-right', 'custom'].includes(preset)) {
    activePreset = preset;
  }

  const { bounds } = screen.getPrimaryDisplay();
  const currentSize = notchWindow.getSize(); // [width, height]
  const w = width ?? currentSize[0];
  const h = currentSize[1];
  const x = calcX(activePreset, w);
  const y = bounds.y;

  safeLog(`[Main] alignWindow preset=${activePreset} x=${x} y=${y} w=${w}`);

  // Single atomic OS-level call — no tearing
  notchWindow.setBounds({ x, y, width: w, height: h }, true);

  // Push updated position back so the simulator can show live coords
  broadcastPosition();
});

// ── overlay:resize ────────────────────────────────────────────────────────
// Called on every state transition.  Uses the STORED preset to recalculate
// x so the pill stays in the correct position as it grows/shrinks.
// Single setBounds call → tear-free repaint.
ipcMain.handle('overlay:resize', (_e, size) => {
  if (!notchWindow || notchWindow.isDestroyed()) return;

  const { bounds } = screen.getPrimaryDisplay();

  // Accept the frontend values directly — no artificial floor of IDLE_W that would
  // over-widen small-pill states. Only guard against garbage (< 100).
  const w = Math.round(Math.max(Number(size?.width) || IDLE_W, 100));
  const h = Math.round(Math.max(Number(size?.height) || IDLE_H, 60));

  const x = activePreset === 'custom'
    ? notchWindow.getBounds().x
    : calcX(activePreset, w);
  const y = bounds.y;

  safeLog(`[Main] resize preset=${activePreset} → w=${w} h=${h} x=${x} y=${y}`);
  notchWindow.setBounds({ x, y, width: w, height: h }, false);
});

// ── overlay:setPosition ───────────────────────────────────────────────────
// Manual drag in design mode → switches preset to 'custom'.
ipcMain.handle('overlay:setPosition', (_e, pos) => {
  if (!notchWindow || notchWindow.isDestroyed()) return;
  activePreset = 'custom'; // user manually positioned it
  const x = Math.round(Number(pos?.x) || 0);
  const y = Math.round(Number(pos?.y) || 0);
  notchWindow.setPosition(x, y);
  broadcastPosition();
});

// ── overlay:getPosition ───────────────────────────────────────────────────
ipcMain.handle('overlay:getPosition', () => {
  if (!notchWindow || notchWindow.isDestroyed()) return { x: 0, y: 0 };
  const [x, y] = notchWindow.getPosition();
  return { x, y };
});

// ── overlay:setClickThrough ───────────────────────────────────────────────
ipcMain.handle('overlay:setClickThrough', (_e, on) => {
  if (!notchWindow || notchWindow.isDestroyed()) return;
  clickThrough = !!on;
  notchWindow.setIgnoreMouseEvents(clickThrough, { forward: true });
  safeLog(`[Main] click-through: ${clickThrough}`);
});

// ── state:update (sim → notch broadcast) ─────────────────────────────────
ipcMain.handle('state:update', (_e, payload) => {
  if (notchWindow && !notchWindow.isDestroyed())
    notchWindow.webContents.send('state-changed', payload);
});

ipcMain.handle('battery:get', async () => cachedBattery);
ipcMain.handle('settings:open', () => createSimWindow());

// ── Internal helpers ──────────────────────────────────────────────────────
function broadcastPosition() {
  if (!notchWindow || notchWindow.isDestroyed()) return;
  const [x, y] = notchWindow.getPosition();
  const msg = { x, y };
  [notchWindow, simWindow].forEach(w => {
    if (w && !w.isDestroyed()) try { w.webContents.send('position-changed', msg); } catch { }
  });
}
