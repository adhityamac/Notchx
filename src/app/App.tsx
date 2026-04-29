import { useState, useRef, useEffect } from 'react';
import { DynamicIsland, IslandState } from './components/DynamicIsland';
import { Play, Timer, Phone, Bell, MonitorStop, GripHorizontal, X, Wifi, Battery, Volume2, Search, LayoutGrid, Folder, Globe, BatteryCharging, Download, Bluetooth, Focus, Maximize, MonitorSmartphone, Camera, Mic, Copy, Type, Layers, Share2, PanelTopClose } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listen } from '@tauri-apps/api/event';

export default function App() {
  const [islandState, setIslandState] = useState<IslandState>('idle');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const constraintsRef = useRef(null);

  // New OS-level states (simulated)
  const [focusMode, setFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dualMonitor, setDualMonitor] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [copiedText, setCopiedText] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(50);
  const [isHovering, setIsHovering] = useState(false);
  const [actualBattery, setActualBattery] = useState(100);

  // Background image
  const wallpaperUrl = "https://images.unsplash.com/photo-1726383222152-134ad0536b76?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aW5kb3dzJTIwMTElMjBkZXNrdG9wJTIwd2FsbHBhcGVyJTIwYWJzdHJhY3R8ZW58MXx8fHwxNzc3MzU3NzIzfDA&ixlib=rb-4.1.0&q=80&w=1920";

  const handleIslandClick = () => {
    if (islandState === 'music') {
      setIsExpanded(!isExpanded);
    }
  };

  const changeState = (newState: IslandState) => {
    setIslandState(newState);
    if (newState !== 'music') setIsExpanded(false);
  };

  // Connect to Real Windows OS events
  useEffect(() => {
    // Only run if we are inside the Tauri desktop app
    if (!window.__TAURI__) return;

    let prevCharging = false;

    const setupListener = async () => {
      const unlisten = await listen('battery-stats', (event: any) => {
        const { percentage, is_charging } = event.payload;
        setActualBattery(Math.round(percentage));

        // When plugged in (changes from false to true)
        if (is_charging && !prevCharging) {
          changeState('battery');
          // Hide it automatically after 3.5 seconds
          setTimeout(() => changeState('idle'), 3500);
        }
        
        prevCharging = is_charging;
      });
      return unlisten;
    };

    let unlistenFn: () => void;
    setupListener().then(fn => { unlistenFn = fn; });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Feature 9: Hover to Peek
  useEffect(() => {
    if (islandState === 'music' && !isExpanded) {
      if (isHovering) {
        setIsExpanded(true);
      }
    }
  }, [isHovering, islandState]);

  // Feature 15: Clipboard History (Simulate Ctrl+C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const text = window.getSelection()?.toString();
        if (text) {
          setCopiedText(text);
          const prevState = islandState;
          changeState('copied');
          setTimeout(() => changeState(prevState), 2000);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [islandState]);

  // Feature 17: Volume Keys & Media Keys (Real OS integration)
  useEffect(() => {
    if (!window.__TAURI__) return;

    let unlistenFn: () => void;

    const setupListener = async () => {
      const unlisten = await listen('media-key', (event: any) => {
        const key = event.payload;
        
        if (key === 'volume-up' || key === 'volume-down' || key === 'volume-mute') {
          // Update simulated volume bar
          setVolumeLevel(v => {
             if (key === 'volume-up') return Math.min(100, v + 5);
             if (key === 'volume-down') return Math.max(0, v - 5);
             return 0; // mute
          });
          
          setIslandState(current => {
            if (current !== 'music') {
               changeState('volume');
               clearTimeout((window as any).volTimeout);
               (window as any).volTimeout = setTimeout(() => changeState('idle'), 1500);
            }
            return current; // if music is open, don't interrupt it, just let volume update in background
          });
        }
        
        if (key === 'play-pause') {
          setIslandState(current => {
            if (current === 'music') {
               changeState('idle'); // stop music
            } else {
               changeState('music'); // start music
            }
            return current;
          });
        }
      });
      return unlisten;
    };

    setupListener().then(fn => { unlistenFn = fn; });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  return (
    <div 
      ref={constraintsRef}
      className={`relative w-full h-screen overflow-hidden flex flex-col font-sans transition-all duration-700 pointer-events-none ${focusMode ? 'grayscale-[20%]' : ''}`}
    >
      {/* Top Bar Area */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div 
            initial={{ y: -50 }} animate={{ y: isMaximized ? -5 : 0 }} exit={{ y: -100 }} transition={{ type: 'spring', damping: 20 }}
            className={`w-full flex justify-center absolute top-0 z-50 pointer-events-none ${dualMonitor ? 'gap-[800px]' : ''}`}
          >
            {/* Feature 18: Dual Monitor Sync */}
            {dualMonitor && (
              <div className="pointer-events-auto">
                <DynamicIsland 
                  activeState={islandState} onClick={handleIslandClick} isExpanded={isExpanded} focusMode={focusMode} cameraActive={cameraActive} micActive={micActive} copiedText={copiedText} volumeLevel={volumeLevel} setVolumeLevel={setVolumeLevel} onHoverPeek={setIsHovering}
                />
              </div>
            )}
            
            <div className="pointer-events-auto">
              <DynamicIsland 
                activeState={islandState} onClick={handleIslandClick} isExpanded={isExpanded} focusMode={focusMode} cameraActive={cameraActive} micActive={micActive} copiedText={copiedText} volumeLevel={volumeLevel} setVolumeLevel={setVolumeLevel} onHoverPeek={setIsHovering}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable Settings Window */}
      {showSettings && (
        <motion.div
          drag dragConstraints={constraintsRef} dragMomentum={false}
          initial={{ x: 100, y: 100, opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="absolute z-40 w-[380px] bg-white/70 dark:bg-black/70 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
          style={{ x: 100, y: 100 }}
        >
          <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing bg-white/30 dark:bg-black/30">
            <div className="flex items-center gap-2 text-black/60 dark:text-white/60">
              <GripHorizontal size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Ultimate Island Simulator</span>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500 hover:text-white transition-colors text-black/60 dark:text-white/60"><X size={16} /></button>
          </div>

          <div className="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            
            {/* Core States */}
            <div>
              <p className="text-xs text-black/50 dark:text-white/50 font-semibold uppercase tracking-wider mb-2">Core States</p>
              <div className="grid grid-cols-2 gap-2">
                <ControlButton active={islandState === 'idle'} onClick={() => changeState('idle')} icon={<MonitorStop size={14} />} label="Idle" />
                <ControlButton active={islandState === 'music'} onClick={() => changeState('music')} icon={<Play size={14} />} label="Music" />
                <ControlButton active={islandState === 'timer'} onClick={() => changeState('timer')} icon={<Timer size={14} />} label="Timer" />
                <ControlButton active={islandState === 'call'} onClick={() => changeState('call')} icon={<Phone size={14} />} label="Call" />
                <ControlButton active={islandState === 'notification'} onClick={() => changeState('notification')} icon={<Type size={14} />} label="Quick Reply" />
                <ControlButton active={islandState === 'battery'} onClick={() => changeState('battery')} icon={<BatteryCharging size={14} className="text-green-500" />} label="Battery" />
                <ControlButton active={islandState === 'download'} onClick={() => changeState('download')} icon={<Download size={14} className="text-blue-500" />} label="Download" />
                <ControlButton active={islandState === 'bluetooth'} onClick={() => changeState('bluetooth')} icon={<Bluetooth size={14} className="text-blue-500" />} label="Bluetooth" />
                <ControlButton active={islandState === 'volume'} onClick={() => changeState('volume')} icon={<Volume2 size={14} />} label="Volume UI" />
                <ControlButton active={islandState === 'progress_edge'} onClick={() => changeState('progress_edge')} icon={<PanelTopClose size={14} />} label="Top Edge Line" />
                <ControlButton active={islandState === 'split'} onClick={() => changeState('split')} icon={<Layers size={14} />} label="Split Island" />
              </div>
            </div>

            <div className="h-px bg-black/5 dark:bg-white/5 w-full" />

            {/* Smart OS Features */}
            <div>
               <p className="text-xs text-black/50 dark:text-white/50 font-semibold uppercase tracking-wider mb-2">Smart OS Integrations</p>
               <div className="grid grid-cols-2 gap-2">
                 <ToggleControl active={focusMode} onClick={() => setFocusMode(!focusMode)} icon={<Focus size={14} />} label="Focus Mode" />
                 <ToggleControl active={isMaximized} onClick={() => setIsMaximized(!isMaximized)} icon={<Maximize size={14} />} label="Snap Window" />
                 <ToggleControl active={isFullscreen} onClick={() => setIsFullscreen(!isFullscreen)} icon={<MonitorStop size={14} />} label="Fullscreen App" />
                 <ToggleControl active={dualMonitor} onClick={() => setDualMonitor(!dualMonitor)} icon={<MonitorSmartphone size={14} />} label="Dual Monitor" />
                 <ToggleControl active={cameraActive} onClick={() => setCameraActive(!cameraActive)} icon={<Camera size={14} className="text-green-500"/>} label="Camera Active" />
                 <ToggleControl active={micActive} onClick={() => setMicActive(!micActive)} icon={<Mic size={14} className="text-orange-500"/>} label="Mic Active" />
               </div>
            </div>

            <p className="text-[11px] text-black/40 dark:text-white/40 italic text-center mt-2">
              Note: Hover the island to peek. Scroll wheel over the island changes volume.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ControlButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 border text-[13px] w-full ${active ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-white/50 dark:bg-black/50 border-black/5 dark:border-white/5 text-black/70 dark:text-white/70 hover:bg-white dark:hover:bg-white/10'}`}>
      {icon} <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
    </button>
  );
}

function ToggleControl({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 border text-[13px] w-full ${active ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500 dark:text-indigo-400' : 'bg-white/50 dark:bg-black/50 border-black/5 dark:border-white/5 text-black/70 dark:text-white/70 hover:bg-white dark:hover:bg-white/10'}`}>
      <div className="flex items-center gap-2">{icon} <span className="font-medium">{label}</span></div>
      <div className={`w-6 h-3.5 rounded-full relative transition-colors ${active ? 'bg-indigo-500' : 'bg-black/20 dark:bg-white/20'}`}>
        <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all ${active ? 'left-3' : 'left-0.5'}`} />
      </div>
    </button>
  );
}
