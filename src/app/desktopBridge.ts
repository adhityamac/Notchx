// ── Window sizes derived from DynamicIsland stateStyles ──────────────────
// windowWidth  = pillWidth  + 40  (20px each side for glow/shadow buffer)
// windowHeight = pillHeight + 52  (12 top-offset + 20 buffer + 20 spring room)
// Layout fix: pill is centered via left:50%;translateX(-50%) so half-width
// buffer each side is sufficient — no more +80px over-sizing needed.
export const DESKTOP_WINDOW_SIZES: Record<string, { width: number; height: number }> = {
  idle:                        { width: 220,  height: 96  },  // pill 180×44
  music:                       { width: 340,  height: 96  },  // pill 300×44
  music_expanded:              { width: 420,  height: 252 },  // pill 380×200
  timer:                       { width: 280,  height: 96  },  // pill 240×44
  call:                        { width: 400,  height: 136 },  // pill 360×84
  notification:                { width: 400,  height: 172 },  // pill 360×120
  battery:                     { width: 260,  height: 96  },  // pill 220×44
  download:                    { width: 320,  height: 96  },  // pill 280×44
  split:                       { width: 360,  height: 96  },  // pill 320×44
  copied:                      { width: 300,  height: 96  },  // pill 260×44
  shared:                      { width: 260,  height: 96  },  // pill 220×44
  volume:                      { width: 280,  height: 96  },  // pill 240×44
  weather:                     { width: 180,  height: 96  },  // pill 140×44
  weather_expanded:            { width: 380,  height: 222 },  // pill 340×170
  calendar:                    { width: 260,  height: 96  },  // pill 220×44
  calendar_expanded:           { width: 360,  height: 182 },  // pill 320×130
  control_center:              { width: 360,  height: 212 },  // pill 320×160
  dropzone:                    { width: 180,  height: 96  },  // pill 140×44
  dropzone_expanded:           { width: 360,  height: 212 },  // pill 320×160
  voice_chat:                  { width: 260,  height: 96  },  // pill 220×44
  voice_chat_expanded:         { width: 380,  height: 232 },  // pill 340×180
  notification_stack:          { width: 240,  height: 96  },  // pill 200×44
  notification_stack_expanded: { width: 380,  height: 312 },  // pill 340×260
  device:                      { width: 380,  height: 116 },  // pill 340×64
};

export const EXPANDABLE_STATES = [
  'music', 'weather', 'calendar', 'dropzone', 'voice_chat', 'notification_stack',
];

export type AlignPreset = 'top-center' | 'top-left' | 'top-right' | 'custom';

export interface DesktopBridge {
  // Resize + reposition in one atomic native call
  resizeOverlay:   (size: { width: number; height: number }) => Promise<void>;
  // Tell backend which preset is active; backend stores + recalcs x/y on every future resize
  alignWindow:     (preset: AlignPreset, width: number)      => Promise<void>;
  getPosition:     ()                                        => Promise<{ x: number; y: number }>;
  setPosition:     (pos: { x: number; y: number })           => Promise<void>;
  setClickThrough: (on: boolean)                             => Promise<void>;
  updateState:     (payload: any)                            => Promise<void>;
  openSettings:    ()                                        => Promise<void>;
  getVolume:       ()                                        => Promise<number>;
  setVolume:       (vol: number)                             => Promise<void>;
  getBattery:      ()                                        => Promise<{ percentage: number; is_charging: boolean }>;
  getWeather:      ()                                        => Promise<{ city: string; weather: any } | null>;
  toggleNetwork:   (type: 'wifi'|'bluetooth', state: boolean)=> Promise<boolean>;
  getMediaSessions?: ()                                      => Promise<any>;
  toggleMediaPlayPause?: ()                                  => Promise<void>;
  nextMediaTrack?:   ()                                      => Promise<void>;
  prevMediaTrack?:   ()                                      => Promise<void>;
  setMediaShuffle?:  (state: boolean)                        => Promise<void>;
  setMediaRepeat?:   (mode: 'off' | 'one' | 'all')           => Promise<void>;
  seekMediaTrack?:   (posSeconds: number)                    => Promise<void>;
  onBatteryUpdate:   (cb: (d: { percentage: number; is_charging: boolean }) => void) => () => void;
  onMediaKey:        (cb: (key: string) => void)   => () => void;
  onMediaUpdate?:    (cb: (m: any) => void)        => () => void;
  onStateChanged:    (cb: (s: any) => void)        => () => void;
  onPositionChanged: (cb: (p: { x: number; y: number }) => void) => () => void;
  onSystemStats?:    (cb: (stats: any) => void)    => () => void;
}

export function getDesktopApi(): DesktopBridge | null {
  return (window as any).notchXDesktop ?? null;
}

export function isDesktopApp(): boolean {
  return !!getDesktopApi();
}

export function getDesktopState(state: string, expanded: boolean): string {
  if (expanded && EXPANDABLE_STATES.includes(state)) return `${state}_expanded`;
  return state;
}

export function getWindowType(): 'notch' | 'settings' | 'web' {
  const p = new URLSearchParams(window.location.search).get('window');
  if (p === 'settings') return 'settings';
  if (isDesktopApp())   return 'notch';
  return 'web';
}

/**
 * Apply a position preset.
 * Delegates entirely to the native backend via alignWindow() so positioning
 * is calculated from real screen bounds rather than renderer screen dimensions.
 * Falls back to frontend setPosition() in browser mode.
 */
export async function applyAlignPreset(preset: AlignPreset, windowWidth: number): Promise<void> {
  const api = getDesktopApi();
  if (!api) return;

  // Native path — backend stores preset, recalcs x/y from real bounds, single setBounds call
  await api.alignWindow(preset, windowWidth);
}
