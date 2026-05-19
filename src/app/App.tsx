import { useCallback, useEffect, useRef, useState } from 'react';
import { DynamicIsland, IslandState } from './components/DynamicIsland';
import { motion, AnimatePresence } from 'motion/react';
import {
  DESKTOP_WINDOW_SIZES, EXPANDABLE_STATES,
  getDesktopApi, getDesktopState, applyAlignPreset, AlignPreset,
} from './desktopBridge';

export default function App() {
  const [islandState, setIslandState] = useState<IslandState>('idle');
  // UX Architecture: Concurrent State Engine
  const [secondaryState, setSecondaryState] = useState<IslandState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const [volumeLevel, setVolumeLevel] = useState(50);
  const [actualBattery, setActualBattery] = useState(100);
  const [systemStats, setSystemStats] = useState({ cpuUsage: 0, ramUsage: 0, totalMemStr: '0GB' });
  const [islandTheme] = useState<'dark' | 'light'>('dark');

  const [timerSecs, setTimerSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contextTimeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [weatherData, setWeatherData] = useState<any>(null);
  const [sharedFile, setSharedFile] = useState<{name: string, size: string} | null>(null);

  const [alignment, setAlignment] = useState<AlignPreset>('top-center');

  // UX: Anti-Intrusion Engine
  const [isGhosted, setIsGhosted] = useState(false);
  const mouseVelocityRef = useRef({ x: 0, y: 0, lastTime: Date.now() });

  useEffect(() => {
    let lastY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - mouseVelocityRef.current.lastTime;
      if (dt > 0) {
        const velocityY = (e.clientY - lastY) / dt;

        // If moving mouse rapidly towards the top of the screen (browser tabs), and not interacting with the island
        if (e.clientY < 60 && velocityY < -1.5 && islandState === 'idle') {
          setIsGhosted(true);
        } else if (e.clientY > 100) {
          setIsGhosted(false);
        }

        lastY = e.clientY;
        mouseVelocityRef.current.lastTime = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [islandState]);

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
    // If a priority state comes in while music/timer is active, move music/timer to secondary state.
    if ((s === 'battery' || s === 'notification' || s === 'volume') && (islandState === 'music' || islandState === 'timer')) {
      setSecondaryState(islandState);
    } else if (s === 'idle') {
      setSecondaryState(null);
    }
    if (s !== 'timer' && timerRef.current) {
      clearInterval(timerRef.current); timerRef.current = null; setTimerSecs(0);
    }
    if (s === 'timer') {
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
        // Evaluate autonomous priority state after revert
        if (secondaryState) {
          changeState(secondaryState);
          setSecondaryState(null);
        } else if (actualBattery < 20) {
          changeState('battery');
        } else if (systemStats.cpuUsage > 85) {
          changeState('device');
        } else {
          changeState('idle');
        }
      }, autoRevert);
    }
  }, [resizeForState, actualBattery, systemStats.cpuUsage]);

  const toggleExpand = useCallback(() => {
    if (islandState === 'idle') {
      changeState('control_center', false);
    } else if (islandState === 'control_center') {
      changeState('weather', true);
    } else if (islandState === 'weather') {
      changeState('calendar', true);
    } else if (islandState === 'calendar') {
      changeState('idle', false);
    } else if (EXPANDABLE_STATES.includes(islandState)) {
      const next = !isExpanded;
      setIsExpanded(next);
      resizeForState(islandState, next);
    }
  }, [isExpanded, islandState, changeState, resizeForState]);

  const [mediaData, setMediaData] = useState<any>(null);

  // ── Autonomous Context Engine Scheduler ──────────────────────────────────
  useEffect(() => {
    const api = getDesktopApi();
    if (!api) return;

    let wasCharging = false;
    let initialSet = false;

    // Get initial battery
    api.getBattery().then((d: any) => {
      setActualBattery(d.percentage);
      wasCharging = d.is_charging;
      initialSet = true;
    }).catch(() => { });

    // Sync initial volume
    api.getVolume().then((vol: number) => setVolumeLevel(vol)).catch(() => { });

    // Sync weather
    if (api.getWeather) {
      api.getWeather().then(d => d && setWeatherData(d)).catch(() => {});
    }

    let mediaInterval: any;
    let uMedia: any;
    if (api.onMediaUpdate) {
      uMedia = api.onMediaUpdate((m: any) => {
        setMediaData(m);
        if (m && m.playbackStatus === 'Playing' && islandState === 'idle') {
          changeState('music', false);
        } else if ((!m || m.playbackStatus !== 'Playing') && islandState === 'music') {
          changeState('idle', false);
        }
      });
    } else if (api.getMediaSessions) {
      const fetchMedia = () => {
        api.getMediaSessions!().then(m => {
          if (m) {
            setMediaData(m);
            if (m.playbackStatus === 'Playing' && islandState === 'idle') {
              changeState('music', false);
            } else if (m.playbackStatus !== 'Playing' && islandState === 'music') {
              changeState('idle', false);
            }
          } else {
            if (islandState === 'music') {
              changeState('idle', false);
            }
          }
        }).catch(() => {});
      };
      fetchMedia();
      mediaInterval = setInterval(fetchMedia, 2000);
    }

    // Battery priority
    const u1 = api.onBatteryUpdate((d: any) => {
      setActualBattery(d.percentage);
      if (initialSet && wasCharging !== d.is_charging) {
        wasCharging = d.is_charging;
        changeState('battery', true, 3000); // show battery state, revert after 3s
      } else if (d.percentage < 20 && !d.is_charging && islandState === 'idle') {
        changeState('battery', false, 3000); // Warn low battery
      }
    });

    // Media priority
    const u2 = api.onMediaKey((k: string) => { 
      if (k === 'play-pause') changeState('music', true, 5000); 
    });

    // Hardware priority
    const u3 = api.onSystemStats?.((s: any) => {
      setSystemStats(s);
      if (s.cpuUsage > 90 && islandState === 'idle') {
        changeState('device', false, 4000);
      }
    }) || (() => {});
    
    return () => { u1(); u2(); u3(); if (uMedia) uMedia(); if (mediaInterval) clearInterval(mediaInterval); };
  }, [changeState, islandState]);

  // ── Desktop Drag-and-Drop Suction ─────────────────────────────────────────
  useEffect(() => {
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
        const file = e.dataTransfer.files[0];
        // Now holds the file in the "Shelf" until dismissed, instead of just saying "shared"
        setSharedFile({ name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + 'MB' });
        changeState('shared', false); // No auto-revert! The user must swipe or drag it out.
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
  }, [islandState, changeState]);

  // Handle Root Level Volume Scroll
  const handleVolumeScroll = useCallback(() => {
    if (islandState === 'idle' || islandState === 'volume') {
      if (islandState === 'idle') changeState('volume', false, 1500);
      else changeState('volume', false, 1500); // refresh timeout
    }
  }, [islandState, changeState]);

  // ════════════════════════════════════════════════════════════════════════
  // NOTCH / WEB VIEW
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div ref={constraintsRef} className="w-screen h-screen overflow-hidden relative">
      {/* Organic "Gooey" Merging Filter */}
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
        <motion.div
          key="island-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="w-full flex absolute z-50 pointer-events-none justify-center top-0"
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
            drag="x"
            dragDirectionLock
            onDragEnd={(e, info) => {
              if (Math.abs(info.velocity.x) > 500 || Math.abs(info.offset.x) > 100) {
                // Swipe detected
                if (info.offset.x > 0) {
                  // Swipe Right -> Next Widget
                  if (islandState === 'weather') changeState('calendar');
                  else if (islandState === 'calendar') changeState('music');
                  else if (islandState === 'music') changeState('idle');
                } else {
                  // Swipe Left -> Prev Widget
                  if (islandState === 'idle') changeState('music');
                  else if (islandState === 'music') changeState('calendar');
                  else if (islandState === 'calendar') changeState('weather');
                }
              }
            }}
            animate={{ x: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <DynamicIsland
              isGhosted={isGhosted}
              activeState={islandState}
              secondaryState={secondaryState}
              onClick={toggleExpand}
              isExpanded={isExpanded}
              focusMode={false}
              cameraActive={false}
              micActive={false}
              copiedText=""
              volumeLevel={volumeLevel}
              setVolumeLevel={(v) => {
                setVolumeLevel(v);
                const api = getDesktopApi();
                if (api) api.setVolume(v).catch(() => {});
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
              onToggleNetwork={(type, state) => {
                const api = getDesktopApi();
                if (api && api.toggleNetwork) api.toggleNetwork(type, state);
              }}
              mediaData={mediaData}
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
