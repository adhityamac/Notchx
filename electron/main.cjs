const { app, BrowserWindow, globalShortcut, ipcMain, powerMonitor, screen } = require('electron');
const path = require('path');
const si = require('systeminformation');
const loudness = require('loudness');

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
      sandbox: true,
    },
  });

  notchWindow.setMenuBarVisibility(false);
  notchWindow.setAlwaysOnTop(true, 'screen-saver');
  notchWindow.loadURL(rendererUrl('notch'));
  notchWindow.on('closed', () => { notchWindow = null; });
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
  if (notchWindow && !notchWindow.isDestroyed()) {
    try { notchWindow.webContents.send('battery-update', p); } catch { }
  }
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
    
    if (notchWindow && !notchWindow.isDestroyed()) {
      try { notchWindow.webContents.send('system-stats-update', stats); } catch { }
    }
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
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
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
  });
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createNotchWindow();
});
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  clearInterval(batteryInterval);
  clearInterval(hardwareInterval);
  if (mediaMonitorProcess) mediaMonitorProcess.kill();
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
  const w = Math.round(Number(size?.width) || IDLE_W);
  const h = Math.round(Number(size?.height) || IDLE_H);

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

// ── volume:get / volume:set ────────────────────────────────────────────────
ipcMain.handle('volume:get', async () => {
  try { return await loudness.getVolume(); } catch { return 50; }
});
ipcMain.handle('volume:set', async (_e, vol) => {
  try { await loudness.setVolume(vol); } catch { }
});

// ── weather:get ───────────────────────────────────────────────────────────
ipcMain.handle('weather:get', async () => {
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
    if (!weatherRes.ok) return null;
    const weather = await weatherRes.json();
    return { city, weather: weather.current_weather };
  } catch (e) {
    console.error('Weather fetch error:', e);
    return null;
  }
});

// ── network:toggle ────────────────────────────────────────────────────────
ipcMain.handle('network:toggle', async (_e, { type, state }) => {
  // state is boolean: true=enable, false=disable
  const { exec } = require('child_process');
  const action = state ? 'enable' : 'disable';

  return new Promise((resolve) => {
    if (type === 'wifi') {
      // Strictly control the command to avoid injection
      const cmd = `powershell -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \\"netsh interface set interface \\\\\\"Wi-Fi\\\\\\" admin=${action}\\"' -Verb RunAs -WindowStyle Hidden"`;
      exec(cmd, (err) => { resolve(!err); });
    } else if (type === 'bluetooth') {
      const psState = state ? 'On' : 'Off';
      // Windows 10/11 Bluetooth toggle via Powershell using BthRadios
      const cmd = `powershell -Command "
        [cmdletbinding()]
        Param()
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $asq = [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime]
        $radios = $asq::GetRadiosAsync().GetResults()
        $bt = $radios | ? { $_.Kind -eq 'Bluetooth' }
        if($bt) { $bt.SetStateAsync('${psState}').GetResults() }
      "`;
      exec(cmd, (err) => { resolve(!err); });
    } else {
      resolve(false);
    }
  });
});

// ── Media SMTC controls ───────────────────────────────────────────────────
let winMedia = null;
import('win-media-control').then(m => { winMedia = m; }).catch(() => {});

let latestMediaData = null;
let mediaMonitorProcess = null;

function startMediaMonitor() {
  const { spawn } = require('child_process');
  const commonPs1 = path.join(__dirname, '../node_modules/win-media-control/scripts/common.ps1');
  const psScript = `
    . '${commonPs1}'
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime] | Out-Null
    $mgr = AwaitAction([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync())
    $asTaskMedia = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.ToString() -match \\"AsTask.*IAsyncOperation\\" })[0].MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])

    while ($true) {
      $session = $mgr.GetCurrentSession()
      if ($session) {
        $pb = $session.GetPlaybackInfo()
        $tl = $session.GetTimelineProperties()
        $mpTask = $session.TryGetMediaPropertiesAsync()
        $mediaTask = $asTaskMedia.Invoke($null, @($mpTask))
        $mediaTask.Wait() | Out-Null
        $media = $mediaTask.Result
        $res = @{
          title = $media.Title
          artist = $media.Artist
          playbackStatus = $pb.PlaybackStatus.ToString()
          repeatMode = $pb.AutoRepeatMode.ToString()
          isShuffle = $pb.IsShuffleActive
          position = $tl.Position.TotalSeconds
          duration = $tl.EndTime.TotalSeconds
        }
        $json = ($res | ConvertTo-Json -Compress)
        Write-Output \\"[[MEDIA_START]]$json[[MEDIA_END]]\\"
      } else {
        Write-Output \\"[[MEDIA_START]]null[[MEDIA_END]]\\"
      }
      Start-Sleep -Milliseconds 300
    }
  `;

  mediaMonitorProcess = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript]);

  let buffer = '';
  mediaMonitorProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    let startIdx;
    while ((startIdx = buffer.indexOf('[[MEDIA_START]]')) !== -1) {
      const endIdx = buffer.indexOf('[[MEDIA_END]]', startIdx);
      if (endIdx !== -1) {
        const jsonStr = buffer.substring(startIdx + 15, endIdx).trim();
        buffer = buffer.substring(endIdx + 13);
        if (jsonStr === 'null') {
          latestMediaData = null;
        } else {
          try {
            latestMediaData = JSON.parse(jsonStr);
          } catch (e) {}
        }
        if (notchWindow && !notchWindow.isDestroyed()) {
          notchWindow.webContents.send('media-update', latestMediaData);
        }
      } else {
        break;
      }
    }
  });

  mediaMonitorProcess.stderr.on('data', () => {});
  mediaMonitorProcess.on('error', () => {});
}

ipcMain.handle('media:get', async () => {
  return latestMediaData;
});

ipcMain.handle('media:playpause', async () => {
  if (!winMedia) return;
  try { await winMedia.togglePlayPause(); } catch (e) {}
});

ipcMain.handle('media:next', async () => {
  if (!winMedia) return;
  try { await winMedia.next(); } catch (e) {}
});

ipcMain.handle('media:prev', async () => {
  if (!winMedia) return;
  try { await winMedia.previous(); } catch (e) {}
});

ipcMain.handle('media:shuffle', async (_e, state) => {
  const { exec } = require('child_process');
  const commonPs1 = path.join(__dirname, '../node_modules/win-media-control/scripts/common.ps1');
  const psBool = state ? '$true' : '$false';
  const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ". '${commonPs1}'; [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime] | Out-Null; $mgr = AwaitAction([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()); $session = $mgr.GetCurrentSession(); if ($session) { $task = $session.TryChangeShuffleActiveAsync(${psBool}); AwaitBool $task }"`;
  exec(cmd, () => {});
});

ipcMain.handle('media:repeat', async (_e, mode) => {
  const { exec } = require('child_process');
  const commonPs1 = path.join(__dirname, '../node_modules/win-media-control/scripts/common.ps1');
  
  const mapping = { 'off': 'None', 'one': 'Track', 'all': 'List' };
  const repeatModeStr = mapping[mode] || 'None';

  const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ". '${commonPs1}'; [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime] | Out-Null; $mgr = AwaitAction([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()); $session = $mgr.GetCurrentSession(); if ($session) { $task = $session.TryChangeAutoRepeatModeAsync([Windows.Media.MediaPlaybackAutoRepeatMode]::${repeatModeStr}); AwaitBool $task }"`;
  exec(cmd, () => {});
});

ipcMain.handle('media:seek', async (_e, posSeconds) => {
  const seconds = parseFloat(posSeconds);
  if (isNaN(seconds)) return;

  const { exec } = require('child_process');
  const commonPs1 = path.join(__dirname, '../node_modules/win-media-control/scripts/common.ps1');
  const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ". '${commonPs1}'; [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime] | Out-Null; $mgr = AwaitAction([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()); $session = $mgr.GetCurrentSession(); if ($session) { $task = $session.TryChangePlaybackPositionAsync([TimeSpan]::FromSeconds(${seconds})); AwaitBool $task }"`;
  exec(cmd, () => {});
});

// ── state:update (sim → notch broadcast) ─────────────────────────────────
ipcMain.handle('state:update', (_e, payload) => {
  if (notchWindow && !notchWindow.isDestroyed())
    notchWindow.webContents.send('state-changed', payload);
});

ipcMain.handle('battery:get', async () => cachedBattery);

// ── Internal helpers ──────────────────────────────────────────────────────
function broadcastPosition() {
  if (!notchWindow || notchWindow.isDestroyed()) return;
  const [x, y] = notchWindow.getPosition();
  const msg = { x, y };
  if (notchWindow && !notchWindow.isDestroyed()) {
    try { notchWindow.webContents.send('position-changed', msg); } catch { }
  }
}
