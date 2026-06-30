import { useCallback, useEffect, useRef, useState } from 'react';
import { DynamicIsland, IslandState, WeatherData, MediaData } from './components/DynamicIsland';
import { motion, AnimatePresence } from 'motion/react';
import {
  DESKTOP_WINDOW_SIZES, EXPANDABLE_STATES,
  getDesktopApi, getDesktopState, applyAlignPreset, AlignPreset,
} from './desktopBridge';

interface BatteryData {
  percentage: number;
  is_charging: boolean;
}

const ALERT_STATES: IslandState[] = ['battery', 'notification', 'volume'];

export default function App() {
  const [islandState, setIslandState] = useState<IslandState>('idle');
  // UX Architecture: Non-Destructive Priority Queue
  // A ref-based stack avoids stale closure bugs in setTimeout callbacks.
  // secondaryState (useState) is the RENDER value — updated whenever the queue changes.
  const stateQueueRef = useRef<IslandState[]>([]);
  const [secondaryState, setSecondaryState] = useState<IslandState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const [volumeLevel, setVolumeLevel] = useState(50);
  const [actualBattery, setActualBattery] = useState(100);
  const [systemStats, setSystemStats] = useState({ cpuUsage: 0, ramUsage: 0, totalMemStr: '0GB' });
  const [islandTheme] = useState<'dark' | 'light'>('dark');

  const [timerSecs, setTimerSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaHealthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [sharedFile, setSharedFile] = useState<{ name: string, size: string, path?: string } | null>(null);
  const [systemSettings, setSystemSettings] = useState<{ wifi: boolean, bluetooth: boolean, dnd: boolean }>({ wifi: true, bluetooth: true, dnd: false });
  const [localTasks, setLocalTasks] = useState<{ id: string, title: string, time: string, isTeams?: boolean, link?: string }[]>([]);

  const [alignment, setAlignment] = useState<AlignPreset>('top-center');

  // UX: Anti-Intrusion Engine
  const [isGhosted, setIsGhosted] = useState(false);
  const mouseVelocityRef = useRef({ x: 0, y: 0, lastTime: Date.now() });

  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const hasWarnedLowBatteryRef = useRef(false);

  // Stable refs for event listeners to prevent re-mounting
  const islandStateRef = useRef<IslandState>(islandState);
  useEffect(() => { islandStateRef.current = islandState; }, [islandState]);

  const mediaDataRef = useRef<any>(mediaData);
  useEffect(() => { mediaDataRef.current = mediaData; }, [mediaData]);

  const actualBatteryRef = useRef<number>(actualBattery);
  useEffect(() => { actualBatteryRef.current = actualBattery; }, [actualBattery]);

  const isExpandedRef = useRef<boolean>(isExpanded);
  useEffect(() => { isExpandedRef.current = isExpanded; }, [isExpanded]);

  const clickTimeoutRef = useRef<any>(null);

  // Clean up global timeouts and intervals on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (contextTimeoutRef.current) clearTimeout(contextTimeoutRef.current);
      if (mediaHealthTimeoutRef.current) clearTimeout(mediaHealthTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let ghostTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - mouseVelocityRef.current.lastTime;
      if (dt > 0) {
        const velocityY = (e.clientY - lastY) / dt;
        const velocityX = (e.clientX - lastX) / dt;

        // Ghost if moving fast (any axis) within 40px of top — covers both
        // rapid upward strokes AND horizontal tab-bar navigation
        if (e.clientY < 40 && (Math.abs(velocityY) > 0.8 || Math.abs(velocityX) > 2.0) && islandStateRef.current === 'idle') {
          setIsGhosted(true);
          if (ghostTimeout) clearTimeout(ghostTimeout);
          ghostTimeout = setTimeout(() => {
            setIsGhosted(false);
          }, 800); // Snap back quickly once user settles on a tab
        } else if (e.clientY > 80) {
          setIsGhosted(false);
          if (ghostTimeout) clearTimeout(ghostTimeout);
        }

        lastX = e.clientX;
        lastY = e.clientY;
        mouseVelocityRef.current.lastTime = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (ghostTimeout) clearTimeout(ghostTimeout);
    };
  }, []);

  // Sync isGhosted with Electron click-through state
  useEffect(() => {
    const api = getDesktopApi();
    if (api) {
      api.setClickThrough(isGhosted).catch(() => {});
    }
  }, [isGhosted]);

  // ── Resize notch window on every state/expand change ────────────────────
  const resizeForState = useCallback((state: IslandState, expanded: boolean) => {
    const api = getDesktopApi();
    if (!api) return;
    const key = getDesktopState(state, expanded);
    const size = DESKTOP_WINDOW_SIZES[key] ?? DESKTOP_WINDOW_SIZES.idle;
    api.resizeOverlay(size).catch(() => { });
  }, []);

  // ── Change state ─────────────────────────────────────────────────────────
  const changeState = useCallback((s: IslandState, expanded = false, autoRevert = 0) => {
    // ── Non-destructive priority queue ───────────────────────────────────────────
    // Transient alerts (battery, notification, volume) push the CURRENT
    // context onto a stack so it can be restored when the alert reverts,
    // instead of permanently overwriting it.
    if (ALERT_STATES.includes(s) && !ALERT_STATES.includes(islandStateRef.current)) {
      // Push the current non-alert state so we can restore it later
      stateQueueRef.current = [islandStateRef.current, ...stateQueueRef.current].slice(0, 4);
    } else if (s === 'idle') {
      // Clearing to idle flushes the entire queue
      stateQueueRef.current = [];
    } else if (!ALERT_STATES.includes(s)) {
      // Any deliberate non-alert navigation clears the queue too
      stateQueueRef.current = [];
    }
    // Sync render value to queue head
    setSecondaryState(stateQueueRef.current[0] ?? null);

    const isTemporary = ['volume', 'battery', 'shared', 'device', 'dropzone', 'copied'].includes(s);
    if (!isTemporary && s !== 'timer' && timerRef.current) {
      clearInterval(timerRef.current); timerRef.current = null; setTimerSecs(0);
    }
    if (s === 'timer' && !timerRef.current) {
      setTimerSecs(0);
      timerRef.current = setInterval(() => setTimerSecs(p => p + 1), 1000);
    }

    if (contextTimeoutRef.current) clearTimeout(contextTimeoutRef.current);

    const willExpand = s === 'control_center' ? true : expanded;
    setIslandState(s);
    setIsExpanded(willExpand);
    resizeForState(s, willExpand);

    if (autoRevert > 0) {
      contextTimeoutRef.current = setTimeout(() => {
        // Pop from the ref-based queue (avoids stale closure reading useState)
        const restored = stateQueueRef.current[0];
        if (restored) {
          stateQueueRef.current = stateQueueRef.current.slice(1);
          setSecondaryState(stateQueueRef.current[0] ?? null);
          changeState(restored);
        } else if (timerRef.current) {
          changeState('timer', false);
        } else if (mediaDataRef.current && mediaDataRef.current.playbackStatus === 'Playing') {
          changeState('music', false);
        } else if (actualBatteryRef.current < 20) {
          changeState('battery');
        } else if (systemStats.cpuUsage > 85) {
          changeState('device');
        } else {
          changeState('idle', false);
        }
      }, autoRevert);
    }
  }, [resizeForState]);

  const handlePillClick = useCallback(() => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      // Double click -> Toggle expand
      if (EXPANDABLE_STATES.includes(islandStateRef.current)) {
        const next = !isExpandedRef.current;
        setIsExpanded(next);
        resizeForState(islandStateRef.current, next);
      }
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        if (isExpandedRef.current) {
          // Single click on expanded view collapses it back to compact
          setIsExpanded(false);
          resizeForState(islandStateRef.current, false);
          return;
        }
        // Cycle to the right: idle -> music -> weather -> calendar -> idle
        const cycle = ['idle', 'music', 'weather', 'calendar'] as IslandState[];
        const idx = cycle.indexOf(islandStateRef.current);
        const nextState = idx === -1 ? 'idle' : cycle[(idx + 1) % cycle.length];
        changeState(nextState, false);
      }, 220); // 220ms delay is standard and extremely responsive
    }
  }, [resizeForState, changeState]);

  const cycleSimulationState = useCallback(() => {
    const SIMULATION_STATES: IslandState[] = [
      'idle',
      'music',
      'battery',
      'timer',
      'device',
      'control_center',
      'weather',
      'calendar',
      'voice_chat',
      'notification_stack'
    ];
    const currentIndex = SIMULATION_STATES.indexOf(islandState);
    const nextIndex = (currentIndex + 1) % SIMULATION_STATES.length;
    const nextState = SIMULATION_STATES[nextIndex];
    const shouldExpand = nextState === 'control_center';
    changeState(nextState, shouldExpand);
  }, [islandState, changeState]);

  // ── Autonomous Context Engine Scheduler ──────────────────────────────────
  useEffect(() => {
    const api = getDesktopApi();
    if (!api) return;

    let wasCharging = false;
    let initialSet = false;

    // Get initial battery
    api.getBattery().then((d: BatteryData) => {
      setActualBattery(d.percentage);
      wasCharging = d.is_charging;
      initialSet = true;
    }).catch((e) => { console.error('Failed to get battery:', e); });

    // Sync initial volume
    api.getVolume().then((vol: number) => setVolumeLevel(vol)).catch((e) => { console.error('Failed to get volume:', e); });

    // Sync weather
    if (api.getWeather) {
      api.getWeather().then(d => d && setWeatherData(d)).catch((e) => { console.error('Failed to fetch weather data:', e); });
    }

    // Sync initial system settings (WiFi, Bluetooth, DND)
    if (api.getSettings) {
      api.getSettings().then((s: any) => {
        if (s) setSystemSettings(s);
      }).catch((e) => { console.error('Failed to get system settings:', e); });
    }

    // Sync initial calendar tasks
    if (api.getTasks) {
      api.getTasks().then((t: any) => {
        if (t) setLocalTasks(t);
      }).catch((e) => { console.error('Failed to get tasks:', e); });
    }

    // States from which music can take over (transient/non-critical)
    const MUSIC_PREEMPTIBLE = ['idle', 'volume', 'battery', 'device', 'copied', 'shared', 'dropzone', 'notification'];

    let mediaInterval: any;
    let uMedia: any;

    // Helper shared by both push and poll paths
    const handleMediaUpdate = (m: MediaData | null) => {
      // Reset health check on every update. If this stops firing, the service is down.
      if (mediaHealthTimeoutRef.current) clearTimeout(mediaHealthTimeoutRef.current);

      setMediaData((prev: MediaData | null) => {
        if (prev && m) {
          // If the view is collapsed, skip triggering a React state update/re-render
          // for minor position changes during playback.
          if (!isExpandedRef.current && prev.title === m.title && prev.playbackStatus === m.playbackStatus) {
            prev.position = m.position;
            return prev;
          }
          if (prev.title === m.title && prev.playbackStatus === m.playbackStatus && prev.position === m.position) {
            return prev;
          }
        }
        return m;
      });

      const cur = islandStateRef.current;
      if (m && m.playbackStatus === 'Playing') {
        if (MUSIC_PREEMPTIBLE.includes(cur)) {
          changeState('music', false);
        }
      } else if (cur === 'music') {
        changeState('idle', false);
      }

      // Set a new timeout. If this fires, the media service is unresponsive.
      mediaHealthTimeoutRef.current = setTimeout(() => {
        if (islandStateRef.current === 'music') {
          console.warn('Media service heartbeat lost. Reverting to idle state.');
          changeState('idle', false);
        }
      }, 5000); // 5-second timeout
    };

    if (api.onMediaUpdate) {
      // Prefer native push-based hook to avoid JS intervals
      uMedia = api.onMediaUpdate(handleMediaUpdate);
    } else if (api.getMediaSessions) {
      // Fallback: active-poll path only if push is completely unsupported
      const fetchMedia = () => {
        api.getMediaSessions!().then((m: MediaData | null) => {
          handleMediaUpdate(m);
        }).catch((e) => { console.error('Failed to fetch media sessions:', e); });
      };
      fetchMedia();
      mediaInterval = setInterval(fetchMedia, 1500);
    }

    // Battery priority
    const u1 = api.onBatteryUpdate((d: any) => {
      setActualBattery(prev => prev !== d.percentage ? d.percentage : prev);
      
      if (d.is_charging || d.percentage >= 20) {
        hasWarnedLowBatteryRef.current = false;
      }

      if (initialSet && wasCharging !== d.is_charging) {
        wasCharging = d.is_charging;
        changeState('battery', true, 2000); // show battery state, revert after 2s
      } else if (d.percentage < 20 && !d.is_charging && !hasWarnedLowBatteryRef.current && !ALERT_STATES.includes(islandStateRef.current)) {
        hasWarnedLowBatteryRef.current = true;
        changeState('battery', false, 2000); // Warn low battery once
      }
    });

    // Media priority
    const u2 = api.onMediaKey((k: string) => {
      if (k === 'play-pause') changeState('music', true, 5000);
    });

    // Hardware priority
    const u3 = api.onSystemStats?.((s: any) => {
      // CRITICAL OPTIMIZATION: Only update React state (triggering full render)
      // if the hardware widget is visible, OR if CPU spikes above threshold
      if (islandStateRef.current === 'device' || s.cpuUsage > 90) {
        setSystemStats(s);
        if (s.cpuUsage > 90 && islandStateRef.current === 'idle') {
          changeState('device', false, 4000);
        }
      }
    }) || (() => { });

    // State sync from backend
    const uState = api.onStateChanged?.((s: any) => {
      changeState(s, false);
    }) || (() => { });

    return () => { u1(); u2(); u3(); uState(); if (uMedia) uMedia(); if (mediaInterval) clearInterval(mediaInterval); if (mediaHealthTimeoutRef.current) clearTimeout(mediaHealthTimeoutRef.current); };
  }, [changeState]);

  // ── Desktop Drag-and-Drop Suction ─────────────────────────────────────────
  const dragCounterRef = useRef(0);
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (islandStateRef.current !== 'dropzone') {
        changeState('dropzone', true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0 && islandStateRef.current === 'dropzone') {
        if (timerRef.current) changeState('timer', false);
        else if (mediaDataRef.current?.playbackStatus === 'Playing') changeState('music', false);
        else changeState('idle');
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        // Now holds the file in the "Shelf" until dismissed, storing the absolute path for drag-out
        setSharedFile({
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(1) + 'MB',
          path: (file as any).path || ''
        });
        changeState('shared', false); // No auto-revert! The user must swipe or drag it out.
      } else {
        if (timerRef.current) changeState('timer', false);
        else if (mediaDataRef.current?.playbackStatus === 'Playing') changeState('music', false);
        else changeState('idle');
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
  }, [changeState]);

  // Handle Root Level Volume Scroll
  const handleVolumeScroll = useCallback(() => {
    if (islandStateRef.current === 'idle' || islandStateRef.current === 'volume') {
      changeState('volume', false, 2000);
    }
  }, [changeState]);

  // ════════════════════════════════════════════════════════════════════════
  // NOTCH / WEB VIEW
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div ref={constraintsRef} className="w-screen h-screen overflow-hidden relative">
      {/* Organic "Gooey" Merging Filter — only mounted when split-pill is active
          to avoid running feGaussianBlur+feColorMatrix continuously at idle. */}
      {secondaryState !== null && (
        <svg className="hidden" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12" result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
      )}
      <AnimatePresence>
        <motion.div
          key="island-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="absolute z-50 pointer-events-none left-1/2 -translate-x-1/2 top-0"
        >
          <motion.div
            layout
            className="pointer-events-auto relative group"
            style={{
              // Fallback border that is barely visible on dark backgrounds, but defines the edge clearly on true-black or complex wallpapers
              '--ambient-border': 'rgba(255, 255, 255, 0.08)'
            } as React.CSSProperties}
            dragConstraints={constraintsRef}
            dragMomentum={false}
            dragElastic={0.1}
            onDragStart={() => setAlignment('custom')}
            animate={{ x: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <DynamicIsland
              isGhosted={isGhosted}
              activeState={islandState}
              secondaryState={secondaryState}
              onClick={handlePillClick}
              onDoubleClick={handlePillClick}
              isExpanded={isExpanded}
              focusMode={false}
              cameraActive={false}
              micActive={false}
              copiedText=""
              volumeLevel={volumeLevel}
              setVolumeLevel={(v) => {
                setVolumeLevel(v);
                const api = getDesktopApi();
                if (api) api.setVolume(v).catch(() => { });
              }}
              onVolumeScroll={handleVolumeScroll}
              onHoverPeek={(hover) => {
                // Hover to auto-expand or subtle scale
                if (hover && !isExpanded && EXPANDABLE_STATES.includes(islandState)) {
                  // Optional hover behavior
                }
              }}
              scaleModifier={1}
              yOffset={0}
              theme={islandTheme}
              actualBattery={actualBattery}
              designMode={false}
              systemStats={systemStats}
              weatherData={weatherData}
              sharedFile={sharedFile}
              systemSettings={systemSettings}
              onToggleSetting={(type, state) => {
                const api = getDesktopApi();
                if (!api) return;
                if (type === 'wifi' || type === 'bluetooth') {
                  api.toggleNetwork(type, state);
                  setSystemSettings(prev => ({ ...prev, [type]: state }));
                } else if (type === 'dnd') {
                  api.toggleDnd(state);
                  setSystemSettings(prev => ({ ...prev, dnd: state }));
                }
              }}
              calendarTasks={localTasks}
              onAddCalendarTask={(title) => {
                const api = getDesktopApi();
                if (!api) return;
                const newTask = {
                  id: Date.now().toString(),
                  title,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Today)',
                  isTeams: title.toLowerCase().includes('teams') || title.toLowerCase().includes('sync'),
                  link: title.toLowerCase().includes('teams') || title.toLowerCase().includes('sync') ? 'msteams://' : ''
                };
                api.addTask(newTask).then((updated: any) => {
                  if (updated) setLocalTasks(updated);
                }).catch(() => {});
              }}
              onLaunchMeeting={(link) => {
                const api = getDesktopApi();
                if (api && api.launchMeeting) api.launchMeeting(link);
              }}
              mediaData={mediaData}
              timerSecs={timerSecs}
              onDismissShared={() => {
                setSharedFile(null);
                changeState('idle');
              }}
              onMediaControl={(action, payload) => {
                const api = getDesktopApi();
                if (!api) return;
                if (action === 'playpause' && api.toggleMediaPlayPause) api.toggleMediaPlayPause();
                else if (action === 'next' && api.nextMediaTrack) api.nextMediaTrack();
                else if (action === 'prev' && api.prevMediaTrack) api.prevMediaTrack();
                else if (action === 'shuffle' && api.setMediaShuffle) api.setMediaShuffle(payload);
                else if (action === 'repeat' && api.setMediaRepeat) api.setMediaRepeat(payload);
                else if (action === 'seek' && api.seekMediaTrack) api.seekMediaTrack(payload);
              }}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
