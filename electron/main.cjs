const { app, BrowserWindow, globalShortcut, ipcMain, powerMonitor, screen } = require('electron');
const path = require('path');
const si = require('systeminformation');
const loudness = require('loudness');

process.stdout.on('error', (e) => { if (e.code !== 'EPIPE') console.error(e); });
process.stderr.on('error', (e) => { if (e.code !== 'EPIPE') console.error(e); });
function safeLog(...a) { try { console.log(...a); } catch { } }

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Idle pill 180Ã—44px + 40px glow buffer each side â†’ initial window 220Ã—96
const IDLE_W = 220;  // pill(180) + 40 glow buffer
const IDLE_H = 96;   // 12(top-offset) + 44(pill) + 40(shadow+spring room)
const POLL = 30_000;

// â”€â”€ Persistent state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Stored in memory so overlay:resize can recalc x/y without being told each time.
// Presets: 'top-center' | 'top-left' | 'top-right' | 'custom'
let activePreset = 'top-center';

let notchWindow = null;

let batteryInterval = null;
let cachedBattery = { percentage: 100, is_charging: false };
let clickThrough = false;
let isAppQuitting = false;

// GPU compositing is required for correct transparent-window rendering on Windows.
// disableHardwareAcceleration() was previously set but forces CPU compositing,
// breaking HiDPI scaling and hurting performance on transparent overlays.

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
function calcX(preset, windowWidth, displayBounds) {
  const bounds = displayBounds || screen.getPrimaryDisplay().bounds;
  switch (preset) {
    case 'top-left': return bounds.x + 16;
    case 'top-right': return bounds.x + bounds.width - windowWidth - 16;
    case 'top-center':
    default: return bounds.x + Math.floor((bounds.width - windowWidth) / 2);
  }
}

// â”€â”€ Notch window â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    thickFrame: false,
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
      sandbox: true,
    },
  });

  notchWindow.setMenuBarVisibility(false);
  notchWindow.setAlwaysOnTop(true, 'screen-saver');
  notchWindow.loadURL(rendererUrl('notch'));
  notchWindow.on('closed', () => { notchWindow = null; });
}

// â”€â”€ Battery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  if (notchWindow && !notchWindow.isDestroyed()) {
    try { notchWindow.webContents.send('battery-update', p); } catch { }
  }
}

// â”€â”€ Hardware Monitoring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let hardwareInterval = null;
async function pushSystemStats() {
  try {
    const [mem, load] = await Promise.all([si.mem(), si.currentLoad()]);

    const stats = {
      cpuUsage: Math.round(load.currentLoad),
      ramUsage: Math.round((mem.active / mem.total) * 100),
      totalMemStr: (mem.total / 1024 / 1024 / 1024).toFixed(1) + 'GB'
    };

    if (notchWindow && !notchWindow.isDestroyed()) {
      try { notchWindow.webContents.send('system-stats-update', stats); } catch { }
    }
  } catch (e) { }
}

// â”€â”€ Shortcuts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
}

// â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on('second-instance', () => { });

  app.whenReady().then(() => {
    createNotchWindow();
    registerShortcuts();
    pushBattery();
    batteryInterval = setInterval(pushBattery, POLL);
    powerMonitor.on('on-ac', pushBattery);
    powerMonitor.on('on-battery', pushBattery);

    hardwareInterval = setInterval(pushSystemStats, 2000);
    pushSystemStats();
    startMediaMonitor();

    // ── Multi-monitor reanchor ──────────────────────────────────────────────
    // Re-position the window whenever displays are added, removed, or scaled.
    // Uses the display nearest the current window position so dragging to a
    // secondary monitor and back still keeps the pill correctly centred.
    const reanchorWindow = () => {
      if (!notchWindow || notchWindow.isDestroyed()) return;
      const winBounds = notchWindow.getBounds();
      const display = screen.getDisplayNearestPoint({ x: winBounds.x + winBounds.width / 2, y: winBounds.y });
      const [w, h] = notchWindow.getSize();
      const x = calcX(activePreset, w, display.bounds);
      notchWindow.setBounds({ x, y: display.bounds.y, width: w, height: h }, false);
      safeLog(`[Main] reanchor display=${display.id} x=${x}`);
    };
    screen.on('display-metrics-changed', reanchorWindow);
    screen.on('display-removed', reanchorWindow);
    screen.on('display-added', reanchorWindow);
  });
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createNotchWindow();
});
app.on('will-quit', () => {
  isAppQuitting = true;
  globalShortcut.unregisterAll();
  clearInterval(batteryInterval);
  clearInterval(hardwareInterval);
  if (mediaMonitorProcess) mediaMonitorProcess.kill();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// IPC HANDLERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ overlay:alignWindow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Single atomic OS-level call â€” no tearing
  notchWindow.setBounds({ x, y, width: w, height: h }, true);

  // Push updated position back so the simulator can show live coords
  broadcastPosition();
});

// â”€â”€ overlay:resize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called on every state transition.  Uses the STORED preset to recalculate
// x so the pill stays in the correct position as it grows/shrinks.
// Single setBounds call â†’ tear-free repaint.
ipcMain.handle('overlay:resize', (_e, size) => {
  if (!notchWindow || notchWindow.isDestroyed()) return;

  const { bounds } = screen.getPrimaryDisplay();

  // Accept the frontend values directly â€” no artificial floor of IDLE_W that would
  // over-widen small-pill states. Only guard against garbage (< 100).
  const w = Math.round(Number(size?.width) || IDLE_W);
  const h = Math.round(Number(size?.height) || IDLE_H);

  const x = activePreset === 'custom'
    ? notchWindow.getBounds().x
    : calcX(activePreset, w);
  const y = bounds.y;

  safeLog(`[Main] resize preset=${activePreset} â†’ w=${w} h=${h} x=${x} y=${y}`);
  notchWindow.setBounds({ x, y, width: w, height: h }, false);
});

// ── network:toggle ────────────────────────────────────────────────────────
ipcMain.handle('network:toggle', async (_e, { type, state }) => {
  // state is boolean: true=enable, false=disable
  const { spawn } = require('child_process');
  const action = state ? 'enable' : 'disable';

  return new Promise((resolve) => {
    let resolved = false;
    let timer = null;

    const doResolve = (val) => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      resolve(val);
    };

    if (type === 'wifi') {
      // Strictly control the command to avoid injection
      const proc = spawn('powershell.exe', [
        '-Command',
        `Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command "netsh interface set interface \\"Wi-Fi\\" admin=${action}"' -Verb RunAs -WindowStyle Hidden`
      ]);
      timer = setTimeout(() => {
        if (!proc.killed) {
          proc.kill();
          safeLog('[Network] WiFi toggle timed out - killed');
        }
        doResolve(false);
      }, 10000);
      proc.on('close', (code) => { doResolve(code === 0); });
      proc.on('error', () => { doResolve(false); });
    } else if (type === 'bluetooth') {
      const psState = state ? 'On' : 'Off';
      // Windows 10/11 Bluetooth toggle via Powershell using BthRadios
      const script = `
        [cmdletbinding()]
        Param()
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $asq = [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime]
        $radios = $asq::GetRadiosAsync().GetResults()
        $bt = $radios | ? { $_.Kind -eq 'Bluetooth' }
        if($bt) { $bt.SetStateAsync('${psState}').GetResults() }
      `;
      const proc = spawn('powershell.exe', ['-Command', script]);
      timer = setTimeout(() => {
        if (!proc.killed) {
          proc.kill();
          safeLog('[Network] Bluetooth toggle timed out - killed');
        }
        doResolve(false);
      }, 10000);
      proc.on('close', (code) => { doResolve(code === 0); });
      proc.on('error', () => { doResolve(false); });
    } else {
      doResolve(false);
    }
  });
});

// â”€â”€ overlay:setPosition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Manual drag in design mode â†’ switches preset to 'custom'.
ipcMain.handle('overlay:setPosition', (_e, pos) => {
  if (!notchWindow || notchWindow.isDestroyed()) return;
  activePreset = 'custom'; // user manually positioned it
  const x = Math.round(Number(pos?.x) || 0);
  const y = Math.round(Number(pos?.y) || 0);
  notchWindow.setPosition(x, y);
  broadcastPosition();
});

// â”€â”€ overlay:getPosition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ipcMain.handle('overlay:getPosition', () => {
  if (!notchWindow || notchWindow.isDestroyed()) return { x: 0, y: 0 };
  const [x, y] = notchWindow.getPosition();
  return { x, y };
});

// â”€â”€ overlay:setClickThrough â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ipcMain.handle('overlay:setClickThrough', (_e, on) => {
  if (!notchWindow || notchWindow.isDestroyed()) return;
  clickThrough = !!on;
  notchWindow.setIgnoreMouseEvents(clickThrough, { forward: true });
  safeLog(`[Main] click-through: ${clickThrough}`);
});

// â”€â”€ volume:get / volume:set â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ipcMain.handle('volume:get', async () => {
  try { return await loudness.getVolume(); } catch { return 50; }
});
ipcMain.handle('volume:set', async (_e, vol) => {
  try { await loudness.setVolume(vol); } catch { }
});

// â”€â”€ weather:get â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let cachedWeather = null;
let lastWeatherFetch = 0;
const WEATHER_TTL = 15 * 60 * 1000; // 15 minutes

ipcMain.handle('weather:get', async () => {
  const now = Date.now();
  if (cachedWeather && (now - lastWeatherFetch < WEATHER_TTL)) {
    return cachedWeather;
  }

  try {
    let lat = 37.7749;
    let lon = -122.4194;
    let city = 'San Francisco';

    try {
      const locRes = await fetch('https://ip-api.com/json/');
      if (locRes.ok) {
        const loc = await locRes.json();
        if (loc.lat && loc.lon) {
          lat = loc.lat;
          lon = loc.lon;
          city = loc.city || city;
        }
      }
    } catch (e) {
      console.error('IP Geolocation error, using default location.');
    }

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph`);
    if (!weatherRes.ok) return cachedWeather; // Fallback to cache if request fails
    const weather = await weatherRes.json();
    cachedWeather = { city, weather: weather.current_weather };
    lastWeatherFetch = now;
    return cachedWeather;
  } catch (e) {
    console.error('Weather fetch error:', e);
    return cachedWeather; // Fallback to cache if request fails
  }
});



// ── Media SMTC controls ──────────────────────────────────────────────────────────────────────
let winMedia = null;
try { winMedia = require('win-media-control'); } catch (e) { safeLog('[Media] win-media-control not available:', e.message); }

let latestMediaData = null;
let mediaMonitorProcess = null;
let mediaWatchdog = null;

function startMediaMonitor() {
  const { spawn } = require('child_process');

  // Self-contained SMTC poller - no common.ps1 dependency
  const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime]
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media,ContentType=WindowsRuntime]

function Await-Task {
  param([object]$WinRtTask, [type]$AsType)
  $m = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Length -eq 1 } |
    Select-Object -First 1
  $gm = $m.MakeGenericMethod($AsType)
  $t = $gm.Invoke($null, @($WinRtTask))
  $t.Wait(10000) | Out-Null
  return $t.Result
}

try {
  $mgr = Await-Task \`
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) \`
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  if ($null -eq $mgr) { throw 'Manager null' }
} catch {
  Write-Host '[[MEDIA_START]]null[[MEDIA_END]]'
  Write-Error "SMTC init failed: $_"
  Start-Sleep -Seconds 5
  exit 1
}

Write-Host '[[MEDIA_START]]null[[MEDIA_END]]'

while ($true) {
  try {
    if ($null -eq $mgr) {
      $mgr = Await-Task ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    }
    $session = $mgr.GetCurrentSession()
    if (-not $session) {
      $sessions = $mgr.GetSessions()
      $session = $sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus -eq 'Playing' } | Select-Object -First 1
      if (-not $session) {
        $session = $sessions | Select-Object -First 1
      }
    }
    if ($session) {
      $pb  = $session.GetPlaybackInfo()
      $tl  = $session.GetTimelineProperties()
      $mp  = Await-Task ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
      if ($null -eq $mp) {
        Write-Host '[[MEDIA_START]]null[[MEDIA_END]]'
      } else {
        $status = try { $pb.PlaybackStatus.ToString() } catch { 'Unknown' }
        $obj = @{
          title          = if ($mp.Title)  { $mp.Title }  else { '' }
          artist         = if ($mp.Artist) { $mp.Artist } else { '' }
          album          = if ($mp.AlbumTitle) { $mp.AlbumTitle } else { '' }
          playbackStatus = $status
          repeatMode     = if ($pb.AutoRepeatMode -ne $null) { $pb.AutoRepeatMode.ToString() } else { 'None' }
          isShuffle      = [bool]$pb.IsShuffleActive
          position       = [math]::Round($tl.Position.TotalSeconds, 1)
          duration       = [math]::Round($tl.EndTime.TotalSeconds, 1)
        }
        $json = $obj | ConvertTo-Json -Compress
        Write-Host "[[MEDIA_START]]$json[[MEDIA_END]]"
      }
    } else {
      Write-Host '[[MEDIA_START]]null[[MEDIA_END]]'
    }
  } catch {
    Write-Error "Poll error: $_"
    Write-Host "RESET"
    exit 0
  }
  Start-Sleep -Milliseconds 300
}
`;


  function spawnMonitor() {
    safeLog('[MediaMonitor] Starting PowerShell SMTC watcher...');
    const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    mediaMonitorProcess = proc;

    function resetWatchdog() {
      if (mediaWatchdog) clearTimeout(mediaWatchdog);
      mediaWatchdog = setTimeout(() => {
        safeLog('[MediaMonitor] Watchdog timeout! Killing hung process...');
        if (mediaMonitorProcess && !mediaMonitorProcess.killed) mediaMonitorProcess.kill();
      }, 10000); // 10 seconds of silence = hang
    }

    resetWatchdog(); // Arm watchdog immediately on spawn to guard against startup deadlock

    let buffer = '';
    proc.stdout.on('data', (data) => {
      resetWatchdog();
      const dataStr = data.toString();
      if (dataStr.includes('RESET')) {
        safeLog('[MediaMonitor] RESET requested by PowerShell. Killing process...');
        if (!proc.killed) proc.kill();
        return;
      }
      buffer += dataStr;
      let startIdx;
      while ((startIdx = buffer.indexOf('[[MEDIA_START]]')) !== -1) {
        const endIdx = buffer.indexOf('[[MEDIA_END]]', startIdx);
        if (endIdx !== -1) {
          const jsonStr = buffer.substring(startIdx + 15, endIdx).trim();
          buffer = buffer.substring(endIdx + 13);
          if (jsonStr === 'null') {
            latestMediaData = null;
          } else {
            try { latestMediaData = JSON.parse(jsonStr); } catch (e) { latestMediaData = null; }
          }
          safeLog('[MediaMonitor] push:', latestMediaData ? `${latestMediaData.title} [${latestMediaData.playbackStatus}]` : 'null');
          if (notchWindow && !notchWindow.isDestroyed()) {
            notchWindow.webContents.send('media-update', latestMediaData);
          }
        } else { break; }
      }
    });

    proc.stderr.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg) safeLog('[MediaMonitor stderr]', msg);
    });

    proc.on('exit', (code) => {
      if (mediaWatchdog) clearTimeout(mediaWatchdog);
      safeLog('[MediaMonitor] exited code', code);
      if (isAppQuitting) return;
      if (notchWindow && !notchWindow.isDestroyed()) {
        safeLog('[MediaMonitor] restarting in 1s...');
        setTimeout(spawnMonitor, 1000);
      }
    });

    proc.on('error', (err) => safeLog('[MediaMonitor spawn error]', err.message));
  }

  spawnMonitor();
}
ipcMain.handle('media:get', async () => {
  return latestMediaData;
});

ipcMain.handle('media:playpause', async () => {
  if (!winMedia) return;
  try { await winMedia.togglePlayPause(); } catch (e) { safeLog('[Media] playpause error:', e.message); }
});

ipcMain.handle('media:next', async () => {
  if (!winMedia) return;
  try { await winMedia.next(); } catch (e) { safeLog('[Media] next track error:', e.message); }
});

ipcMain.handle('media:prev', async () => {
  if (!winMedia) return;
  try { await winMedia.previous(); } catch (e) { safeLog('[Media] prev track error:', e.message); }
});

ipcMain.handle('media:shuffle', async (_e, state) => {
  // Security: self-contained PS script — no commonPs1 path interpolation, no exec
  const { spawn } = require('child_process');
  // Strict boolean: only ever $true or $false — no user data reaches the command
  const psBool = state ? '$true' : '$false';
  const script = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime]
function Await-Task { param([object]$t,[type]$T) $m=[System.WindowsRuntimeSystemExtensions].GetMethods()|?{$_.Name-eq'AsTask'-and$_.IsGenericMethod-and$_.GetParameters().Length-eq1}|Select-Object -First 1; $gm=$m.MakeGenericMethod($T); $t2=$gm.Invoke($null,@($t)); $t2.Wait(10000)|Out-Null; return $t2.Result }
$mgr = Await-Task ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$session = $mgr.GetCurrentSession()
if ($session) { $null = $session.TryChangeShuffleActiveAsync(${psBool}).AsTask().GetAwaiter().GetResult() }
`;
  const proc = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script
  ], { stdio: 'ignore' });
  const timer = setTimeout(() => {
    if (!proc.killed) {
      proc.kill();
      safeLog('[Media] shuffle process timed out - killed');
    }
  }, 10000);
  proc.on('exit', () => clearTimeout(timer));
  proc.on('error', (err) => {
    clearTimeout(timer);
    safeLog('[Media] shuffle spawn error:', err.message);
  });
});

ipcMain.handle('media:repeat', async (_e, mode) => {
  // Security: allow-list the repeat mode value — only three valid enum strings
  const mapping = { off: 'None', one: 'Track', all: 'List' };
  const repeatModeStr = mapping[mode] || 'None'; // guaranteed safe static string
  const { spawn } = require('child_process');
  const script = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime]
function Await-Task { param([object]$t,[type]$T) $m=[System.WindowsRuntimeSystemExtensions].GetMethods()|?{$_.Name-eq'AsTask'-and$_.IsGenericMethod-and$_.GetParameters().Length-eq1}|Select-Object -First 1; $gm=$m.MakeGenericMethod($T); $t2=$gm.Invoke($null,@($t)); $t2.Wait(10000)|Out-Null; return $t2.Result }
$mgr = Await-Task ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$session = $mgr.GetCurrentSession()
if ($session) { $null = $session.TryChangeAutoRepeatModeAsync([Windows.Media.MediaPlaybackAutoRepeatMode]::${repeatModeStr}).AsTask().GetAwaiter().GetResult() }
`;
  const proc = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script
  ], { stdio: 'ignore' });
  const timer = setTimeout(() => {
    if (!proc.killed) {
      proc.kill();
      safeLog('[Media] repeat process timed out - killed');
    }
  }, 10000);
  proc.on('exit', () => clearTimeout(timer));
  proc.on('error', (err) => {
    clearTimeout(timer);
    safeLog('[Media] repeat spawn error:', err.message);
  });
});

ipcMain.handle('media:seek', async (_e, posSeconds) => {
  // Security: parse + validate — only a finite float reaches the PS command
  const seconds = parseFloat(posSeconds);
  if (!isFinite(seconds) || seconds < 0) return;
  const { spawn } = require('child_process');
  // seconds is a validated JS float — safe to embed as numeric literal
  const script = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime]
function Await-Task { param([object]$t,[type]$T) $m=[System.WindowsRuntimeSystemExtensions].GetMethods()|?{$_.Name-eq'AsTask'-and$_.IsGenericMethod-and$_.GetParameters().Length-eq1}|Select-Object -First 1; $gm=$m.MakeGenericMethod($T); $t2=$gm.Invoke($null,@($t)); $t2.Wait(10000)|Out-Null; return $t2.Result }
$mgr = Await-Task ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$session = $mgr.GetCurrentSession()
if ($session) { $null = $session.TryChangePlaybackPositionAsync([TimeSpan]::FromSeconds(${seconds})).AsTask().GetAwaiter().GetResult() }
`;
  const proc = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script
  ], { stdio: 'ignore' });
  const timer = setTimeout(() => {
    if (!proc.killed) {
      proc.kill();
      safeLog('[Media] seek process timed out - killed');
    }
  }, 10000);
  proc.on('exit', () => clearTimeout(timer));
  proc.on('error', (err) => {
    clearTimeout(timer);
    safeLog('[Media] seek spawn error:', err.message);
  });
});

// â”€â”€ state:update (sim â†’ notch broadcast) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ipcMain.handle('state:update', (_e, payload) => {
  if (notchWindow && !notchWindow.isDestroyed())
    notchWindow.webContents.send('state-changed', payload);
});

ipcMain.handle('battery:get', async () => cachedBattery);

// â”€â”€ Internal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function broadcastPosition() {
  if (!notchWindow || notchWindow.isDestroyed()) return;
  const [x, y] = notchWindow.getPosition();
  const msg = { x, y };
  if (notchWindow && !notchWindow.isDestroyed()) {
    try { notchWindow.webContents.send('position-changed', msg); } catch { }
  }
}
