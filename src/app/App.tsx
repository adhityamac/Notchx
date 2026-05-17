import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { DynamicIsland, IslandState } from './components/DynamicIsland';
import {
  Play, Timer, Phone, MonitorStop, Volume2, BatteryCharging,
  Download, Focus, Maximize, MonitorSmartphone, Camera, Mic, Type, Layers,
  CloudSun, SlidersHorizontal, Calendar as CalendarIcon, FileUp, Activity,
  List, HardDrive, Settings, Edit2, GripHorizontal, X, MousePointer, MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DESKTOP_WINDOW_SIZES, EXPANDABLE_STATES,
  getDesktopApi, getDesktopState, getWindowType, applyAlignPreset, AlignPreset,
} from './desktopBridge';

const SettingsDashboard = lazy(() =>
  import('./components/SettingsDashboard').then((m) => ({ default: m.SettingsDashboard })),
);

const MOCK = {
  music: { track: 'Midnight City', artist: 'M83' },
  call: { caller: 'Sarah Connor' },
  battery: { level: 23 },
};

export default function App() {
  const windowType = getWindowType();

  const [islandState, setIslandState] = useState<IslandState>('idle');
  const [isExpanded, setIsExpanded] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const [focusMode, setFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(50);
  const [actualBattery, setActualBattery] = useState(100);
  const [systemStats, setSystemStats] = useState({ cpuUsage: 0, ramUsage: 0, totalMemStr: '0GB' });
  const [islandTheme] = useState<'dark' | 'light'>('dark');

  // Sim-only
  const [designMode, setDesignMode] = useState(false);
  const [clickThrough, setClickThrough] = useState(false);
  const [alignment, setAlignment] = useState<AlignPreset>('top-center');
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const [showFullSettings, setShowFullSettings] = useState(false);

  const [timerSecs, setTimerSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── Resize notch window on every state/expand change ────────────────────
  const resizeForState = useCallback((state: IslandState, expanded: boolean) => {
    const api = getDesktopApi();
    if (!api) return;
    const key = getDesktopState(state, expanded);
    const size = DESKTOP_WINDOW_SIZES[key] ?? DESKTOP_WINDOW_SIZES.idle;
    api.resizeOverlay(size).catch(() => { });
  }, []);

  // ── Change state ─────────────────────────────────────────────────────────
  const changeState = useCallback((s: IslandState, expanded = false) => {
    if (s !== 'timer' && timerRef.current) {
      clearInterval(timerRef.current); timerRef.current = null; setTimerSecs(0);
    }
    if (s === 'timer') {
      setTimerSecs(0);
      timerRef.current = setInterval(() => setTimerSecs(p => p + 1), 1000);
    }
    const willExpand = s === 'control_center' ? true : expanded;
    setIslandState(s);
    setIsExpanded(willExpand);
    if (windowType === 'settings') {
      getDesktopApi()?.updateState({ state: s, expanded: willExpand });
    }
    resizeForState(s, willExpand);
  }, [windowType, resizeForState]);

  const handleVolumeScroll = useCallback(() => {
    if (islandState === 'idle' || islandState === 'volume') {
      if (islandState === 'idle') changeState('volume');
      if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
      volumeTimeoutRef.current = setTimeout(() => {
        changeState('idle');
      }, 1500);
    }
  }, [islandState, changeState]);

  const toggleExpand = useCallback(() => {
    if (!EXPANDABLE_STATES.includes(islandState)) return;
    const next = !isExpanded;
    setIsExpanded(next);
    if (windowType === 'settings') getDesktopApi()?.updateState({ state: islandState, expanded: next });
    resizeForState(islandState, next);
  }, [isExpanded, islandState, windowType, resizeForState]);

  // ── Receive state from sim ───────────────────────────────────────────────
  useEffect(() => {
    const api = getDesktopApi();
    if (!api?.onStateChanged) return;
    return api.onStateChanged((p: { state: IslandState; expanded: boolean }) => {
      setIslandState(p.state);
      setIsExpanded(p.expanded ?? false);
      resizeForState(p.state, p.expanded ?? false);
    });
  }, [resizeForState]);

  // ── Battery, Media & System Volume ───────────────────────────────────────
  useEffect(() => {
    const api = getDesktopApi();
    if (!api) return;

    let wasCharging = false;
    let initialSet = false;

    // Get initial
    api.getBattery().then((d: any) => {
      setActualBattery(d.percentage);
      wasCharging = d.is_charging;
      initialSet = true;
    }).catch(() => { });

    api.getVolume().then((vol: number) => setVolumeLevel(vol)).catch(() => { });

    const u1 = api.onBatteryUpdate((d: any) => {
      setActualBattery(d.percentage);
      if (initialSet && wasCharging !== d.is_charging) {
        wasCharging = d.is_charging;
        changeState('battery');
      }
    });
    const u2 = api.onMediaKey((k: string) => { if (k === 'play-pause') changeState('music'); });
    const u3 = api.onSystemStats?.((s: any) => setSystemStats(s)) || (() => {});
    
    return () => { u1(); u2(); u3(); };
  }, [changeState]);

  // ── Live position ────────────────────────────────────────────────────────
  useEffect(() => {
    const api = getDesktopApi();
    if (!api?.onPositionChanged) return;
    return api.onPositionChanged((p) => setLivePos(p));
  }, []);

  // ── Desktop Drag-and-Drop Suction ─────────────────────────────────────────
  useEffect(() => {
    if (windowType === 'settings') return;
    
    let dragCounter = 0;
    
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (islandState !== 'dropzone') {
        changeState('dropzone', true);
      }
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0 && islandState === 'dropzone') {
        changeState('idle');
      }
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        changeState('shared');
        setTimeout(() => changeState('idle'), 2500);
      } else {
        changeState('idle');
      }
    };
    
    const handleDragOver = (e: DragEvent) => e.preventDefault();

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [windowType, islandState, changeState]);

  const toggleDesignMode = useCallback(async (on: boolean) => {
    setDesignMode(on);
    if (!on) {
      await applyAlignPreset('top-center', DESKTOP_WINDOW_SIZES[getDesktopState(islandState, isExpanded)]?.width ?? 260);
      setAlignment('top-center');
    }
  }, [islandState, isExpanded]);

  const toggleClickThrough = useCallback(async (on: boolean) => {
    setClickThrough(on);
    await getDesktopApi()?.setClickThrough(on);
  }, []);

  const applyPreset = useCallback(async (preset: AlignPreset) => {
    setAlignment(preset);
    const key = getDesktopState(islandState, isExpanded);
    const w = DESKTOP_WINDOW_SIZES[key]?.width ?? 260;
    await applyAlignPreset(preset, w);
    const pos = await getDesktopApi()?.getPosition();
    if (pos) setLivePos(pos);
  }, [islandState, isExpanded]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ════════════════════════════════════════════════════════════════════════
  // SIMULATOR WINDOW
  // ════════════════════════════════════════════════════════════════════════
  if (windowType === 'settings') {
    return (
      <div className="w-full h-full bg-[#f5f5f7] dark:bg-[#1c1c1e] overflow-y-auto select-none text-black dark:text-white">
        <div className="h-10 flex items-center justify-between px-3 bg-white/60 dark:bg-black/40 border-b border-black/5 dark:border-white/5 sticky top-0 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 text-black/50 dark:text-white/40">
            <GripHorizontal size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Ultimate Island Simulator</span>
          </div>
          <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-black/40 dark:text-white/40 transition-colors">
            <X size={13} />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-3">
          <section>
            <p className="text-[9px] font-bold uppercase tracking-widest text-black/35 dark:text-white/30 mb-2">Core States</p>
            <div className="grid grid-cols-2 gap-1.5">
              <SimBtn active={islandState === 'idle'} onClick={() => changeState('idle')} icon={<MonitorStop size={13} />} label="Idle" />
              <SimBtn active={islandState === 'music'} onClick={() => changeState('music')} icon={<Play size={13} />} label="Music" />
              <SimBtn active={islandState === 'timer'} onClick={() => changeState('timer')} icon={<Timer size={13} />} label="Timer" />
              <SimBtn active={islandState === 'call'} onClick={() => changeState('call')} icon={<Phone size={13} />} label="Call" />
              <SimBtn active={islandState === 'notification'} onClick={() => changeState('notification')} icon={<Type size={13} />} label="Quick Reply" />
              <SimBtn active={islandState === 'battery'} onClick={() => changeState('battery')} icon={<BatteryCharging size={13} className="text-green-500" />} label="Battery" />
              <SimBtn active={islandState === 'download'} onClick={() => changeState('download')} icon={<Download size={13} className="text-blue-500" />} label="Download" />
              <SimBtn active={islandState === 'device'} onClick={() => changeState('device')} icon={<HardDrive size={13} className="text-indigo-400" />} label="Device" />
              <SimBtn active={islandState === 'volume'} onClick={() => changeState('volume')} icon={<Volume2 size={13} />} label="Volume UI" />
              <SimBtn active={islandState === 'weather'} onClick={() => changeState('weather')} icon={<CloudSun size={13} className="text-sky-500" />} label="Weather" />
              <SimBtn active={islandState === 'calendar'} onClick={() => changeState('calendar')} icon={<CalendarIcon size={13} className="text-purple-500" />} label="Calendar" />
              <SimBtn active={islandState === 'control_center'} onClick={() => changeState('control_center')} icon={<SlidersHorizontal size={13} className="text-indigo-500" />} label="Control Center" />
              <SimBtn active={islandState === 'dropzone'} onClick={() => changeState('dropzone')} icon={<FileUp size={13} className="text-purple-400" />} label="Dropzone" />
              <SimBtn active={islandState === 'voice_chat'} onClick={() => changeState('voice_chat')} icon={<Activity size={13} className="text-green-500" />} label="Voice Chat" />
              <SimBtn active={islandState === 'notification_stack'} onClick={() => changeState('notification_stack')} icon={<List size={13} className="text-rose-400" />} label="Notifications" />
              <SimBtn active={islandState === 'split'} onClick={() => changeState('split')} icon={<Layers size={13} />} label="Split Island" />
            </div>
          </section>

          {islandState === 'timer' && (
            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg px-3 py-1.5 text-[11px] text-orange-600 dark:text-orange-400 font-mono text-center">
              ⏱ {String(Math.floor(timerSecs / 60)).padStart(2, '0')}:{String(timerSecs % 60).padStart(2, '0')} running
            </div>
          )}

          <div className="h-px bg-black/5 dark:bg-white/5" />

          {EXPANDABLE_STATES.includes(islandState) && (
            <SimToggle active={isExpanded} onClick={toggleExpand} icon={<Maximize size={13} />} label={`Expand ${islandState}`} />
          )}

          <div className="h-px bg-black/5 dark:bg-white/5" />

          <section>
            <p className="text-[9px] font-bold uppercase tracking-widest text-black/35 dark:text-white/30 mb-2">Positioning & Design</p>
            <div className="flex flex-col gap-1.5">
              <SimToggle active={designMode} onClick={() => toggleDesignMode(!designMode)} icon={<Edit2 size={13} />} label="Design Mode (drag pill)" />
              <select
                value={alignment}
                onChange={(e) => applyPreset(e.target.value as AlignPreset)}
                className="bg-white dark:bg-black/50 border border-black/8 dark:border-white/8 rounded-md px-2 py-1.5 text-[11px] text-black/60 dark:text-white/60 focus:outline-none w-full"
              >
                <option value="top-center">Top Center (default)</option>
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="custom">Custom (Drag)</option>
              </select>
              {livePos && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-black/5 dark:bg-white/5 rounded-md text-[10px] text-black/40 dark:text-white/35 font-mono">
                  <MapPin size={10} /> x={livePos.x} y={livePos.y}
                </div>
              )}
            </div>
          </section>

          <div className="h-px bg-black/5 dark:bg-white/5" />

          <section>
            <p className="text-[9px] font-bold uppercase tracking-widest text-black/35 dark:text-white/30 mb-2">Smart OS Integrations</p>
            <div className="grid grid-cols-2 gap-1.5">
              <SimToggle active={focusMode} onClick={() => setFocusMode(!focusMode)} icon={<Focus size={13} />} label="Focus Mode" />
              <SimToggle active={isMaximized} onClick={() => setIsMaximized(!isMaximized)} icon={<Maximize size={13} />} label="Snap Window" />
              <SimToggle active={isFullscreen} onClick={() => setIsFullscreen(!isFullscreen)} icon={<MonitorStop size={13} />} label="Fullscreen" />
              <SimToggle active={cameraActive} onClick={() => setCameraActive(!cameraActive)} icon={<Camera size={13} className="text-green-500" />} label="Camera Active" />
              <SimToggle active={micActive} onClick={() => setMicActive(!micActive)} icon={<Mic size={13} className="text-orange-500" />} label="Mic Active" />
              <SimToggle active={clickThrough} onClick={() => toggleClickThrough(!clickThrough)} icon={<MousePointer size={13} className={clickThrough ? 'text-purple-400' : ''} />} label="Click Through" />
            </div>
          </section>

          <p className="text-[9px] text-black/25 dark:text-white/20 italic text-center">
            Hover pill to peek · Scroll wheel changes volume · Ctrl+Shift+I toggle
          </p>

          <button
            onClick={() => setShowFullSettings(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-[11px] font-semibold shadow hover:shadow-md transition-all"
          >
            <Settings size={12} /> Open Complete Dashboard
          </button>
        </div>

        <AnimatePresence>
          {showFullSettings && (
            <Suspense fallback={null}>
              <SettingsDashboard key="sd" onClose={() => setShowFullSettings(false)} />
            </Suspense>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // NOTCH / WEB VIEW
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div ref={constraintsRef} className="w-screen h-screen overflow-hidden relative">
      {/* Phase 4: Organic "Gooey" Merging Filter */}
      <svg className="hidden" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            key="island-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: isMaximized ? -5 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-full flex absolute z-50 pointer-events-none justify-center top-0"
          >
            <motion.div
              layout
              className="pointer-events-auto relative"
              drag={designMode}
              dragConstraints={constraintsRef}
              dragMomentum={false}
              dragElastic={0.1}
              onDragStart={() => setAlignment('custom')}
              animate={designMode ? undefined : { x: 0, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              whileDrag={{ scale: 1.05 }}
            >
              <DynamicIsland
                activeState={islandState}
                onClick={toggleExpand}
                isExpanded={isExpanded}
                focusMode={focusMode}
                cameraActive={cameraActive}
                micActive={micActive}
                copiedText=""
                volumeLevel={volumeLevel}
                setVolumeLevel={setVolumeLevel}
                onHoverPeek={() => { }}
                scaleModifier={1}
                yOffset={0}
                theme={islandTheme}
                actualBattery={actualBattery}
                designMode={designMode}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sim components ────────────────────────────────────────────────────────
function SimBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all text-[11px] w-full border
        ${active
          ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
          : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/5 text-black/65 dark:text-white/65 hover:bg-gray-50 dark:hover:bg-white/10'
        }`}
    >
      {icon}
      <span className="font-medium truncate">{label}</span>
    </button>
  );
}

function SimToggle({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all text-[11px] w-full border col-span-1
        ${active
          ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
          : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/5 text-black/65 dark:text-white/65 hover:bg-gray-50 dark:hover:bg-white/10'
        }`}
    >
      <div className="flex items-center gap-1.5">{icon}<span className="font-medium">{label}</span></div>
      <div className={`w-5 h-3 rounded-full relative flex-shrink-0 transition-colors ${active ? 'bg-indigo-500' : 'bg-black/15 dark:bg-white/15'}`}>
        <div className={`w-2 h-2 bg-white rounded-full absolute top-0.5 transition-all ${active ? 'left-2.5' : 'left-0.5'}`} />
      </div>
    </button>
  );
}
