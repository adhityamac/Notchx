const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notchXDesktop', {
  // ── Window geometry ──────────────────────────────────────────────────────
  // Resize + reposition in one atomic native call (uses stored preset for x/y)
  resizeOverlay: (size) => ipcRenderer.invoke('overlay:resize', size),
  // Tell the backend which preset is active; backend stores it and recalcs x/y on every resize
  alignWindow: (preset, width) => ipcRenderer.invoke('overlay:alignWindow', { preset, width }),
  getPosition: () => ipcRenderer.invoke('overlay:getPosition'),
  setPosition: (pos) => ipcRenderer.invoke('overlay:setPosition', pos),
  setClickThrough: (on) => ipcRenderer.invoke('overlay:setClickThrough', on),

  // ── Simulator → Notch state sync ─────────────────────────────────────────
  updateState: (payload) => ipcRenderer.invoke('state:update', payload),
  openSettings: () => ipcRenderer.invoke('settings:open'),

  // ── Volume ───────────────────────────────────────────────────────────────
  getVolume: () => ipcRenderer.invoke('volume:get'),
  setVolume: (vol) => ipcRenderer.invoke('volume:set', vol),

  // ── Battery ───────────────────────────────────────────────────────────────
  getBattery: () => ipcRenderer.invoke('battery:get'),
  onBatteryUpdate: (cb) => {
    const fn = (_e, v) => cb(v);
    ipcRenderer.on('battery-update', fn);
    return () => ipcRenderer.removeListener('battery-update', fn);
  },
  // ── Network & Weather ───────────────────────────────────────────────────
  getWeather: () => ipcRenderer.invoke('weather:get'),
  toggleNetwork: (type, state) => ipcRenderer.invoke('network:toggle', { type, state }),
  getMediaSessions: () => ipcRenderer.invoke('media:get'),
  toggleMediaPlayPause: () => ipcRenderer.invoke('media:playpause'),
  nextMediaTrack: () => ipcRenderer.invoke('media:next'),
  prevMediaTrack: () => ipcRenderer.invoke('media:prev'),
  setMediaShuffle: (state) => ipcRenderer.invoke('media:shuffle', state),
  setMediaRepeat: (mode) => ipcRenderer.invoke('media:repeat', mode),
  seekMediaTrack: (posSeconds) => ipcRenderer.invoke('media:seek', posSeconds),

  // ── Push listeners ────────────────────────────────────────────────────────
  onMediaKey: (cb) => {
    const fn = (_e, k) => cb(k);
    ipcRenderer.on('media-key', fn);
    return () => ipcRenderer.removeListener('media-key', fn);
  },
  onMediaUpdate: (cb) => {
    const fn = (_e, m) => cb(m);
    ipcRenderer.on('media-update', fn);
    return () => ipcRenderer.removeListener('media-update', fn);
  },
  onStateChanged: (cb) => {
    const fn = (_e, s) => cb(s);
    ipcRenderer.on('state-changed', fn);
    return () => ipcRenderer.removeListener('state-changed', fn);
  },
  onPositionChanged: (cb) => {
    const fn = (_e, p) => cb(p);
    ipcRenderer.on('position-changed', fn);
    return () => ipcRenderer.removeListener('position-changed', fn);
  },
  onSystemStats: (cb) => {
    const fn = (_e, s) => cb(s);
    ipcRenderer.on('system-stats-update', fn);
    return () => ipcRenderer.removeListener('system-stats-update', fn);
  },
});
