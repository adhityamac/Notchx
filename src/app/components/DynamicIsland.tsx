import { motion, AnimatePresence, useMotionValue, useSpring, useAnimationFrame, useTransform } from 'motion/react';
import { useState, useEffect, forwardRef, useRef } from 'react';
import { Phone, PhoneOff, Timer, Bell, BatteryCharging, Download, Bluetooth, Send, Copy, Share2, Volume2, Mic, Wind, Droplets, Calendar as CalendarIcon, Video, Wifi, Moon, Sun, Cloud, BatteryMedium, BatteryFull, BatteryLow, FileUp, CheckCircle2, Activity, Users, MessageSquare, Mail, HardDrive, Shuffle, Repeat } from 'lucide-react';
import { TrueAudioVisualizer } from './TrueAudioVisualizer';

// ── Liquid-bg helper: maps an island state to its CSS tint modifier ──────────
function liquidClass(state: string): string {
  const map: Record<string, string> = {
    music: 'state-music', call: 'state-call', timer: 'state-timer',
    battery: 'state-battery', download: 'state-download',
    weather: 'state-weather', weather_expanded: 'state-weather',
    notification: 'state-notification', voice_chat: 'state-voice_chat',
    voice_chat_expanded: 'state-voice_chat',
  };
  return map[state] ?? '';
}

export type IslandState = 'idle' | 'music' | 'timer' | 'call' | 'notification' | 'battery' | 'download' | 'device' | 'split' | 'copied' | 'shared' | 'volume' | 'weather' | 'calendar' | 'control_center' | 'dropzone' | 'voice_chat' | 'notification_stack';

export interface WeatherData {
  city: string;
  weather: { temperature?: number; windspeed?: number; is_day?: number };
}
export interface MediaData {
  title?: string;
  artist?: string;
  playbackStatus?: string;
  position?: number;
  duration?: number;
  isShuffle?: boolean;
  repeatMode?: 'Track' | 'List' | 'off' | 'one' | 'all';
}

export interface DynamicIslandProps {
  isGhosted?: boolean;
  activeState: IslandState;
  secondaryState?: IslandState | null;
  onClick?: () => void;
  onDoubleClick?: () => void;
  isExpanded?: boolean;
  focusMode?: boolean;
  cameraActive?: boolean;
  micActive?: boolean;
  copiedText?: string;
  volumeLevel?: number;
  setVolumeLevel?: (vol: number) => void;
  onHoverPeek?: (isHovering: boolean) => void;
  scaleModifier?: number;
  yOffset?: number;
  theme?: 'dark' | 'light';
  actualBattery?: number;
  designMode?: boolean;
  systemStats?: { cpuUsage: number, ramUsage: number, totalMemStr: string };
  onVolumeScroll?: () => void;
  weatherData?: WeatherData | null;
  sharedFile?: { name: string, size: string } | null;
  onToggleNetwork?: (type: 'wifi' | 'bluetooth', state: boolean) => void;
  mediaData?: MediaData | null;
  onMediaControl?: (action: string, payload?: any) => void;
  timerSecs?: number;
  onDismissShared?: () => void;
}

// Bug 1 fix: every state MUST have explicit width + height so Framer Motion
// always animates back to the correct pill dimensions, never relies on CSS defaults
const IDLE_DIMS = { width: 180, height: 44, borderRadius: 24, top: 12 };

const stateStyles: Record<string, { width: number; height: number; borderRadius: number; top: number; backgroundColor?: string; boxShadow?: string }> = {
  idle: { width: 180, height: 44, borderRadius: 24, top: 12 },
  music: { width: 300, height: 44, borderRadius: 24, top: 12 },
  music_expanded: { width: 380, height: 200, borderRadius: 36, top: 12 },
  timer: { width: 240, height: 44, borderRadius: 24, top: 12 },
  call: { width: 360, height: 84, borderRadius: 36, top: 12 },
  notification: { width: 360, height: 120, borderRadius: 36, top: 12 },
  battery: { width: 220, height: 44, borderRadius: 24, top: 12 },
  download: { width: 280, height: 44, borderRadius: 24, top: 12 },
  split: { width: 320, height: 44, borderRadius: 24, top: 12, backgroundColor: 'transparent', boxShadow: 'none' },
  copied: { width: 260, height: 44, borderRadius: 24, top: 12 },
  shared: { width: 220, height: 44, borderRadius: 24, top: 12 },
  volume: { width: 240, height: 44, borderRadius: 24, top: 12 },
  weather: { width: 140, height: 44, borderRadius: 24, top: 12 },
  weather_expanded: { width: 340, height: 170, borderRadius: 36, top: 12 },
  calendar: { width: 220, height: 44, borderRadius: 24, top: 12 },
  calendar_expanded: { width: 320, height: 130, borderRadius: 36, top: 12 },
  control_center: { width: 320, height: 112, borderRadius: 36, top: 12 },
  dropzone: { width: 140, height: 44, borderRadius: 24, top: 12 },
  dropzone_expanded: { width: 320, height: 160, borderRadius: 36, top: 12 },
  voice_chat: { width: 220, height: 44, borderRadius: 24, top: 12 },
  voice_chat_expanded: { width: 340, height: 180, borderRadius: 36, top: 12 },
  notification_stack: { width: 200, height: 44, borderRadius: 24, top: 12 },
  notification_stack_expanded: { width: 340, height: 260, borderRadius: 36, top: 12 },
  device: { width: 340, height: 64, borderRadius: 32, top: 12 },
};

// Subtle glows depending on the active context - with premium iOS expanded elevation shadows
const glowStyles: Record<string, string> = {
  music_expanded: '0px 32px 64px rgba(0,0,0,0.5), 0px 8px 24px rgba(0,0,0,0.3)',
  timer: '0px 8px 30px rgba(249,115,22,0.2)',
  call: '0px 24px 48px rgba(0,0,0,0.4), 0px 6px 16px rgba(0,0,0,0.2)',
  battery: '0px 8px 30px rgba(34,197,94,0.15)',
  download: '0px 8px 30px rgba(0,122,255,0.2)',
  volume: '0px 8px 30px rgba(255,255,255,0.1)',
  weather_expanded: '0px 32px 64px rgba(0,0,0,0.5), 0px 8px 24px rgba(0,0,0,0.3)',
  calendar_expanded: '0px 32px 64px rgba(0,0,0,0.5), 0px 8px 24px rgba(0,0,0,0.3)',
  control_center: '0px 24px 48px rgba(0,0,0,0.4), 0px 6px 16px rgba(0,0,0,0.2)',
  dropzone_expanded: '0px 32px 64px rgba(0,0,0,0.5), 0px 8px 24px rgba(0,0,0,0.3)',
  voice_chat: '0px 8px 30px rgba(34,197,94,0.2)',
  voice_chat_expanded: '0px 32px 64px rgba(0,0,0,0.5), 0px 8px 24px rgba(0,0,0,0.3)',
  notification_stack_expanded: '0px 32px 64px rgba(0,0,0,0.5), 0px 8px 24px rgba(0,0,0,0.3)',
  device: '0px 24px 48px rgba(0,0,0,0.4), 0px 6px 16px rgba(0,0,0,0.2)',
  split: 'none',
  default: '0px 10px 30px rgba(0,0,0,0.5)',
};

// Phase 2 fix: consistent spring keeps pill at exact target dims on every transition.
// Higher stiffness + lower mass → snappier settle; damping prevents overshoot clip.
const springTransition = {
  type: 'spring',
  stiffness: 420,
  damping: 28,
  mass: 0.7,
  restDelta: 0.001,
};

export const DynamicIsland = ({
  isGhosted, activeState, secondaryState, onClick, onDoubleClick, isExpanded, focusMode,
  cameraActive, micActive, copiedText, volumeLevel = 50, setVolumeLevel, onHoverPeek,
  scaleModifier = 1, yOffset = 0, theme = 'dark', actualBattery = 100, designMode = false,
  onVolumeScroll, systemStats, weatherData, sharedFile, onToggleNetwork, mediaData, onMediaControl,
  timerSecs = 0, onDismissShared
}: DynamicIslandProps) => {

  let currentState = activeState as string;
  if (isExpanded) {
    if (activeState === 'music') currentState = 'music_expanded';
    if (activeState === 'weather') currentState = 'weather_expanded';
    if (activeState === 'calendar') currentState = 'calendar_expanded';
    if (activeState === 'dropzone') currentState = 'dropzone_expanded';
    if (activeState === 'voice_chat') currentState = 'voice_chat_expanded';
    if (activeState === 'notification_stack') currentState = 'notification_stack_expanded';
  }

  // Bug 1 fix: always fall back to IDLE_DIMS so the pill never loses its shape
  const baseStyle = stateStyles[currentState] ?? IDLE_DIMS;
  const currentGlow = focusMode ? 'none' : (glowStyles[currentState] || glowStyles.default);
  const currentWidth = (focusMode && typeof baseStyle.width === 'number') ? baseStyle.width * 0.9 : baseStyle.width;

  // Re-triggering HMR
  const isLightMode = theme === 'light';

  // Feature 4: Cursor Magnetism
  const islandRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const magneticX = useSpring(mouseX, springConfig);
  const magneticY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!islandRef.current) return;
      const rect = islandRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;

      // If mouse is within 200px, attract slightly
      if (Math.abs(distanceX) < 200 && Math.abs(distanceY) < 100) {
        mouseX.set(distanceX * 0.05); // 5% pull
        mouseY.set(distanceY * 0.1);
      } else {
        mouseX.set(0);
        mouseY.set(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [currentState, mouseX, mouseY]);

  // Feature 12: Drag & Drop Sharing
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOver(true);
  };
  const handleDragLeave = () => setIsDraggedOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOver(false);
    // In App.tsx, we will handle the "shared" state change, but we can animate a bit here
    if (onClick) onClick(); // trigger a change
  };

  // Feature 10: Scroll Wheel Volume
  const handleWheel = (e: React.WheelEvent) => {
    if (activeState === 'music' || activeState === 'volume' || activeState === 'idle') {
      const delta = e.deltaY > 0 ? -5 : 5;
      if (setVolumeLevel) setVolumeLevel(Math.max(0, Math.min(100, volumeLevel + delta)));
      if (onVolumeScroll) onVolumeScroll();
    }
  };

  // If it's split state, we render two separate islands
  if (currentState === 'split') {
    return (
      <>
        <svg width="0" height="0" className="absolute pointer-events-none">
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </svg>
        <motion.div
          className="relative z-50 flex gap-2 pointer-events-none items-center justify-center h-10"
          style={{
            top: baseStyle.top,
            filter: 'url(#goo)',
            opacity: isGhosted ? 0.3 : 1,
            pointerEvents: isGhosted ? 'none' : 'none'
          }}
        >
          <motion.div
            layout
            transition={springTransition}
            className="bg-[#000000] text-white overflow-hidden pointer-events-auto flex items-center px-4 gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            style={{ width: 160, height: 40, borderRadius: 24 }}
          >
            <img src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop" className="w-6 h-6 rounded-full" alt="Art" />
            <div className="flex gap-0.5">
              <TrueAudioVisualizer compact maxHeight={16} />
            </div>
          </motion.div>

          <motion.div
            layout
            transition={springTransition}
            className="bg-[#000000] text-white overflow-hidden pointer-events-auto flex items-center justify-center shadow-[0_8px_30px_rgba(249,115,22,0.2)]"
            style={{ width: 80, height: 40, borderRadius: 24 }}
          >
            <div className="flex items-center gap-1 text-orange-500 font-medium text-sm">
              <Timer size={14} /> 12:05
            </div>
          </motion.div>
        </motion.div>
      </>
    );
  }

  const isSplit = secondaryState !== null && secondaryState !== undefined;
  const splitWidth = 44; // Circular split pill
  const gap = 12; // Gap between primary and secondary

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!onDoubleClick) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[role="button"]') ||
      target.closest('.cursor-pointer:not(.backdrop-blur-xl)')
    ) {
      return;
    }
    onDoubleClick();
  };

  return (
    <>
      <AnimatePresence>
      {isSplit && (
        <motion.div
          key="split-pill"
          initial={{ opacity: 0, scale: 0.5, x: 0 }}
          animate={{ opacity: 1, scale: 1, x: (currentWidth / 2) + gap + (splitWidth / 2) }}
          exit={{ opacity: 0, scale: 0.5, x: 0 }}
          transition={springTransition}
          className="absolute top-0 bg-[#000000] text-white overflow-hidden pointer-events-auto flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          style={{
            width: splitWidth,
            height: 44,
            borderRadius: 24,
            opacity: isGhosted ? 0.4 : 1,
            pointerEvents: isGhosted ? 'none' : 'auto'
          }}
        >
          <AnimatePresence mode="popLayout">
            {secondaryState === 'music' && (
              <motion.div key="music-split" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}>
                <img src={mediaData?.thumbnail || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop"} className="w-8 h-8 rounded-full object-cover animate-[spin_4s_linear_infinite]" alt="Album Art" />
              </motion.div>
            )}
            {secondaryState === 'timer' && (
              <motion.div key="timer-split" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}} className="text-orange-500 flex items-center justify-center">
                <Timer size={20} strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      </AnimatePresence>

      <motion.div
        ref={islandRef}
        layout
      initial={false}
      animate={{
        width: currentWidth,
        height: baseStyle.height,
        borderRadius: baseStyle.borderRadius,
        border: '1px solid var(--ambient-border)',
        top: (baseStyle.top as number) + yOffset,
        boxShadow: isDraggedOver ? '0px 0px 40px rgba(59,130,246,0.6)' : currentGlow,
        scale: (isGhosted ? 0.8 : (isDraggedOver ? 1.05 : 1)) * scaleModifier
      }}
      whileHover={{ scale: isGhosted ? 0.8 : 1.02 * scaleModifier }}
      whileTap={{ scale: isGhosted ? 0.8 : 0.98 * scaleModifier }}
      transition={springTransition}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => onHoverPeek && onHoverPeek(true)}
      onMouseLeave={() => onHoverPeek && onHoverPeek(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onWheel={handleWheel}
      style={{
        originX: 0.5, originY: 0,
        x: magneticX,
        y: magneticY,
        opacity: isGhosted ? 0.15 : 1,
        pointerEvents: isGhosted ? 'none' : 'auto'
      }}
      className={`
        backdrop-blur-xl overflow-hidden relative z-50
        ${designMode ? 'cursor-grab active:cursor-grabbing border-2 border-dashed border-blue-500' : 'cursor-pointer'}
        ${isLightMode ? 'bg-white/90 text-black' : 'bg-[#000000] text-white'}
        ring-1 ${isLightMode ? 'ring-black/5' : 'ring-white/10'} flex items-center justify-center
      `}
    >
      {/* Phase 3: Liquid-bg mesh blob — behind all content, GPU-composited */}
      <div className={`liquid-bg ${liquidClass(activeState)}`} aria-hidden="true" />
      {/* Shimmer sweep for premium glass feel */}
      <div className="liquid-shimmer" aria-hidden="true" />

      {/* Feature 16: Privacy Indicators */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1.5 z-50 pointer-events-none">
        {cameraActive && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>}
        {micActive && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_#f97316]"></div>}
      </div>

      <AnimatePresence mode="popLayout">
        {activeState === 'idle' && <IdleContent key="idle" />}
        {activeState === 'music' && <MusicContent key="music" isExpanded={isExpanded} media={mediaData} onMediaControl={onMediaControl} />}
        {activeState === 'timer' && <TimerContent key="timer" timerSecs={timerSecs} />}
        {activeState === 'call' && <CallContent key="call" />}
        {activeState === 'notification' && <NotificationContent key="notification" />}
        {activeState === 'battery' && <BatteryContent key="battery" batteryLevel={actualBattery} />}
        {activeState === 'download' && <DownloadContent key="download" />}
        {activeState === 'device' && <DeviceContent key="device" stats={systemStats} />}
        {activeState === 'copied' && <CopiedContent key="copied" text={copiedText} />}
        {activeState === 'shared' && <SharedContent key="shared" file={sharedFile} onDismiss={onDismissShared} />}
        {activeState === 'volume' && <VolumeContent key="volume" level={volumeLevel} />}
        {activeState === 'weather' && <WeatherContent key="weather" isExpanded={isExpanded} data={weatherData} />}
        {activeState === 'calendar' && <CalendarContent key="calendar" isExpanded={isExpanded} />}
        {activeState === 'control_center' && <ControlCenterContent key="control_center" onToggle={onToggleNetwork} />}
        {activeState === 'dropzone' && <DropzoneContent key="dropzone" isExpanded={isExpanded} />}
        {activeState === 'voice_chat' && <VoiceChatContent key="voice_chat" isExpanded={isExpanded} />}
        {activeState === 'notification_stack' && <NotificationStackContent key="notification_stack" isExpanded={isExpanded} />}
      </AnimatePresence>
    </motion.div>
    </>
  );
};

// Sub-components for different states

// Phase 2 fix: all content components use the same enter/exit shape (opacity + scale)
// so AnimatePresence can tween them cleanly without the pill geometry flickering.
const IdleContent = forwardRef<HTMLDivElement>((props, ref) => {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    const updateTime = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    // Sync to the exact start of the next minute
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    timeoutId = setTimeout(() => {
      updateTime();
      intervalId = setInterval(updateTime, 60000); // Update every 60 seconds thereafter
    }, msUntilNextMinute);

    return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="w-full h-full flex items-center justify-between px-4 select-none group"
      {...props}
    >
      {/* Beautiful Time Display */}
      <div className="flex items-center gap-1.5 pl-1">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
        <span className="text-xs font-bold tracking-wider text-white/90">{time}</span>
      </div>
      {/* Scroll-volume affordance hint — pure CSS opacity, zero JS overhead */}
      <div className="affordance-hint flex items-center gap-1 pr-1" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="4" y="1" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.2" className="text-white/50"/>
          <line x1="6" y1="3" x2="6" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-white/50"/>
          <path d="M3 9.5L6 11L9 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-white/40"/>
        </svg>
      </div>
    </motion.div>
  );
});

const MusicContent = forwardRef<HTMLDivElement, { isExpanded?: boolean; media?: MediaData | null; onMediaControl?: (action: string, payload?: any) => void }>(({ isExpanded, media, onMediaControl, ...props }, ref) => {
  const [isPlaying, setIsPlaying] = useState(media ? media.playbackStatus === 'Playing' : true);
  const [isShuffle, setIsShuffle] = useState(media?.isShuffle || false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(media?.repeatMode === 'Track' ? 'one' : media?.repeatMode === 'List' ? 'all' : 'off');
  const [duration, setDuration] = useState(media?.duration || 214);

  const progressVal = useMotionValue(media?.duration ? (media.position / media.duration) * 100 : 35);

  useEffect(() => {
    if (media) {
      setIsPlaying(media.playbackStatus === 'Playing');
      if (media.isShuffle !== undefined) setIsShuffle(media.isShuffle);
      if (media.repeatMode !== undefined) {
        setRepeatMode(media.repeatMode === 'Track' ? 'one' : media.repeatMode === 'List' ? 'all' : 'off');
      }
      if (media.duration && media.position !== undefined) {
        setDuration(media.duration);
        progressVal.set((media.position / media.duration) * 100);
      }
    }
  }, [media, progressVal]);

  // 60fps hardware-accelerated progress interpolation without React re-renders
  useAnimationFrame((_time, delta) => {
    // Step 3 performance gate: bail early when music is not playing or view
    // is collapsed — avoids 60fps DOM work when MusicContent is invisible.
    if (!isPlaying || duration <= 0 || !isExpanded) return;
    const deltaSecs = delta / 1000;
    const increment = (deltaSecs / duration) * 100;
    let next = progressVal.get() + increment;
    if (next >= 100) next = 0; // Loop back to start
    progressVal.set(next);
  });

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(p => !p);
    if (onMediaControl) onMediaControl('playpause');
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    progressVal.set(0);
    if (onMediaControl) onMediaControl('next');
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    progressVal.set(0);
    if (onMediaControl) onMediaControl('prev');
  };

  const handleShuffle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);
    if (onMediaControl) onMediaControl('shuffle', nextShuffle);
  };

  const handleRepeat = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRepeat = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(nextRepeat);
    if (onMediaControl) onMediaControl('repeat', nextRepeat);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    progressVal.set(newProgress);
    const targetSeconds = (newProgress / 100) * duration;
    if (onMediaControl) onMediaControl('seek', targetSeconds);
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainSecs = Math.floor(secs % 60);
    return `${mins}:${remainSecs < 10 ? '0' : ''}${remainSecs}`;
  };

  // Directly bind text values to the motion value to avoid re-renders
  const widthTransform = useTransform(progressVal, p => `${p}%`);
  const currentTimeText = useTransform(progressVal, p => formatTime((p / 100) * duration));
  const remainTimeText = useTransform(progressVal, p => `-${formatTime(duration - ((p / 100) * duration))}`);

  const title = media?.title || 'Midnight City';
  const artist = media?.artist || 'M83';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="w-full h-full flex flex-col justify-between px-3 py-2 absolute inset-0 select-none"
      {...props}
    >
      {/* Compact View */}
      <motion.div
        className="w-full h-full flex items-center justify-between"
        animate={{ opacity: isExpanded ? 0 : 1 }}
        transition={{ duration: 0.18 }}
        style={{ pointerEvents: isExpanded ? 'none' : 'auto' }}
      >
        <div className="flex items-center gap-2 h-full">
          <img
            src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop"
            alt="Album Art"
            className="w-7 h-7 rounded-full object-cover"
          />
          <div className="flex flex-col overflow-hidden max-w-[120px]">
            <span className="text-xs font-semibold truncate">{title}</span>
            <span className="text-[9px] opacity-60 truncate">{artist}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 h-full pr-6">
          <TrueAudioVisualizer compact maxHeight={16} />
        </div>
      </motion.div>

      {/* Expanded View */}
      <motion.div
        className="absolute inset-0 p-4 flex flex-col justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.25, delay: isExpanded ? 0.08 : 0 }}
        style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
      >
        <div className="flex items-start gap-3">
          {/* Album art + spring tonearm */}
          <div className="relative shrink-0">
            <img
              src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop"
              alt="Album Art"
              className="w-16 h-16 rounded-2xl object-cover shadow-lg"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}
            />
            {/* Tonearm — spring-physics via CSS keyframes defined in theme.css */}
            <div
              className={`absolute -top-1 -right-3 origin-top-left ${isPlaying ? 'tonearm-playing' : 'tonearm-paused'}`}
              style={{ transformOrigin: '4px 4px' }}
            >
              <svg width="28" height="48" viewBox="0 0 28 48" fill="none">
                <circle cx="4" cy="4" r="3.5" fill="rgba(255,255,255,0.6)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <line x1="4" y1="4" x2="22" y2="44" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="22" cy="44" r="2.5" fill="rgba(255,255,255,0.8)" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col mt-1 flex-1 overflow-hidden">
            <span className="font-semibold text-base leading-tight tracking-tight truncate">{title}</span>
            <span className="opacity-50 text-xs mt-0.5 truncate">{artist}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-1">
          {/* Interactive Progress bar */}
          <div
            onClick={handleProgressClick}
            className="w-full h-2 bg-white/15 hover:bg-white/20 transition-colors rounded-full overflow-hidden cursor-pointer relative py-0.5 flex items-center"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full relative"
              style={{ width: widthTransform }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <div className="flex justify-between text-[10px] opacity-40 px-0.5 font-medium">
            <motion.span>{currentTimeText}</motion.span><motion.span>{remainTimeText}</motion.span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-1 mt-0.5">
            {/* Shuffle Button */}
            <button
              onClick={handleShuffle}
              className={`p-2 rounded-xl transition-all cursor-pointer ${isShuffle ? 'text-blue-400 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'opacity-50 hover:opacity-100'}`}
            >
              <Shuffle size={16} strokeWidth={2.5} />
            </button>

            <div className="flex items-center gap-6">
              <button onClick={handlePrev} className="opacity-70 hover:opacity-100 transition-opacity active:scale-90 cursor-pointer">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="19 20 9 12 19 4 19 20" />
                </svg>
              </button>
              <button
                onClick={handlePlayPause}
                className="bg-white text-black p-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] cursor-pointer"
              >
                {isPlaying
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                }
              </button>
              <button onClick={handleNext} className="opacity-70 hover:opacity-100 transition-opacity active:scale-90 cursor-pointer">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="5 4 15 12 5 20 5 4" />
                </svg>
              </button>
            </div>

            {/* Repeat Button */}
            <button
              onClick={handleRepeat}
              className={`p-2 rounded-xl transition-all cursor-pointer relative ${repeatMode !== 'off' ? 'text-blue-400 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'opacity-50 hover:opacity-100'}`}
            >
              <Repeat size={16} strokeWidth={2.5} />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-bold w-3 h-3 rounded-full flex items-center justify-center shadow-[0_0_5px_#3b82f6]">1</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

const TimerContent = forwardRef<HTMLDivElement, { timerSecs?: number }>((props, ref) => {
  const { timerSecs = 0, ...rest } = props;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="w-full h-full flex items-center justify-between px-5"
      {...rest}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]">
        <Timer size={14} strokeWidth={2.5} />
      </div>
      <div className="flex items-center gap-1 text-amber-500 tracking-wider pr-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <motion.span
          animate={{ fontVariationSettings: ['"wght" 400', '"wght" 800', '"wght" 400'] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="text-[15px] font-medium drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
        >
          {formatTime(timerSecs)}
        </motion.span>
      </div>
    </motion.div>
  );
});

const CallContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
    className="w-full h-full flex items-center justify-between px-5 absolute inset-0"
    {...props}
  >
    <div className="flex items-center gap-4">
      <img
        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
        alt="Caller"
        className="w-12 h-12 rounded-full object-cover shadow-lg border border-white/5"
      />
      <div className="flex flex-col">
        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-0.5 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">Incoming Call</span>
        <span className="text-white/90 font-semibold text-lg tracking-wide">Sarah Connor</span>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <button className="w-11 h-11 rounded-full bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:scale-105 active:scale-95 transition-all border border-white/10">
        <PhoneOff size={20} strokeWidth={2.5} />
      </button>
      <button className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(52,211,153,0.4)] hover:scale-105 active:scale-95 transition-all border border-white/10">
        <Phone size={20} strokeWidth={2.5} className="fill-white" />
      </button>
    </div>
  </motion.div>
));

// Feature 14: Quick Reply Input
const NotificationContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className="w-full h-full flex flex-col justify-center px-5 absolute inset-0 py-3 gap-2"
    {...props}
  >
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white shrink-0 shadow-lg border border-white/10">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.33-.35-.76-.53-1.09a.09.09 0 0 0-.07-.03c-1.5.26-2.94.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95.0.02.01.04.02.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.03.02.02.08-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.01.02.04.03.07.02 1.71-.53 3.44-1.33 5.24-2.65.02-.01.03-.03.03-.05.4-4.18-.46-8.08-3.1-11.95-.01-.01-.02-.02-.03-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" /></svg>
      </div>
      <div className="flex flex-col flex-1 mt-0.5">
        <div className="flex items-center justify-between">
          <span className="text-white/90 font-bold text-sm tracking-wide">Discord - Alice</span>
          <span className="text-white/50 text-[10px] font-medium tracking-widest uppercase">now</span>
        </div>
        <span className="text-white/70 text-[13px] line-clamp-1 mt-0.5 font-medium">Are we still on for the raid tonight?</span>
      </div>
    </div>
    <div className="flex gap-2.5 items-center mt-2">
      <input type="text" placeholder="Quick reply..." className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#5865F2] placeholder:text-white/30 shadow-inner" onClick={(e) => e.stopPropagation()} />
      <button className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5865F2] to-blue-400 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-[0_0_10px_rgba(88,101,242,0.4)]" onClick={(e) => e.stopPropagation()}>
        <Send size={14} className="ml-0.5" strokeWidth={2.5} />
      </button>
    </div>
  </motion.div>
));

const BatteryContent = forwardRef<HTMLDivElement, { batteryLevel: number }>(({ batteryLevel, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.2 }}
    className="w-full h-full flex items-center justify-between px-5 absolute inset-0"
    {...props}
  >
    <div className="flex items-center gap-2.5">
      {batteryLevel < 20 ? (
        <BatteryLow size={20} strokeWidth={2.5} className="text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
      ) : batteryLevel < 90 ? (
        <BatteryMedium size={20} strokeWidth={2.5} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
      ) : (
        <BatteryFull size={20} strokeWidth={2.5} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
      )}
      <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-0.5">
        {batteryLevel === 100 ? 'Fully Charged' : 'Battery'}
      </span>
    </div>
    <div className={`${batteryLevel < 20 ? 'text-rose-500' : batteryLevel < 90 ? 'text-amber-400' : 'text-emerald-400'} font-bold text-sm tracking-wide`}>
      {batteryLevel}%
    </div>
  </motion.div>
));

const DownloadContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 10 }}
    transition={{ duration: 0.2 }}
    className="w-full h-full flex items-center justify-between px-5 absolute inset-0 gap-3"
    {...props}
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center shrink-0 shadow-lg">
      <Download size={14} strokeWidth={2.5} className="animate-bounce" />
    </div>
    <div className="flex flex-col flex-1 mt-0.5">
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-white/90 text-xs font-semibold truncate max-w-[120px]">NotchX_Setup.exe</span>
        <span className="text-white/60 text-[10px] font-medium tracking-wide">1.2 GB / 4.5 GB</span>
      </div>
      <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden shadow-inner">
        <motion.div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" initial={{ width: '0%' }} animate={{ width: '30%' }} transition={{ duration: 2, ease: "linear", repeat: Infinity, repeatType: "reverse" }} />
      </div>
    </div>
  </motion.div>
));

const DeviceContent = forwardRef<HTMLDivElement, { stats?: { cpuUsage: number, ramUsage: number, totalMemStr: string } }>(({ stats, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, filter: 'blur(4px)' }}
    animate={{ opacity: 1, filter: 'blur(0px)' }}
    exit={{ opacity: 0, filter: 'blur(4px)' }}
    transition={{ duration: 0.2 }}
    className="w-full h-full flex flex-col justify-center px-6 absolute inset-0 gap-1"
    {...props}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-white/80" />
        <span className="text-white font-semibold text-xs tracking-wide">System Performance</span>
      </div>
      <span className="text-white/50 text-[10px] tracking-wider font-mono">{stats?.totalMemStr || '0GB'} RAM</span>
    </div>

    <div className="flex items-center gap-3 w-full">
      <div className="flex flex-col flex-1 gap-1">
        <div className="flex justify-between text-[9px] font-bold text-white/60">
          <span>CPU</span>
          <span>{stats?.cpuUsage || 0}%</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-blue-500 rounded-full" animate={{ width: `${stats?.cpuUsage || 0}%` }} transition={{ ease: 'easeOut' }} />
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-1">
        <div className="flex justify-between text-[9px] font-bold text-white/60">
          <span>RAM</span>
          <span>{stats?.ramUsage || 0}%</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-indigo-500 rounded-full" animate={{ width: `${stats?.ramUsage || 0}%` }} transition={{ ease: 'easeOut' }} />
        </div>
      </div>
    </div>
  </motion.div>
));

// Feature 15: Clipboard History
const CopiedContent = forwardRef<HTMLDivElement, { text?: string }>(({ text, ...props }, ref) => (
  <motion.div ref={ref} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full h-full flex items-center justify-center gap-3 px-5" {...props}>
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 shrink-0 shadow-inner border border-white/5">
      <Copy size={14} strokeWidth={2.5} />
    </div>
    <span className="text-white font-semibold text-sm truncate max-w-[180px] tracking-wide">Copied "{text}"</span>
  </motion.div>
));

// Feature 12: Drag & Drop Shared — Functional File Shelf
// Files dropped IN show here; the row is draggable so users can drag OUT to
// other apps (Explorer, email, etc.). A dismiss button clears the shelf.
const SharedContent = forwardRef<HTMLDivElement, { file?: { name: string, size: string } | null; onDismiss?: () => void }>(
  ({ file, onDismiss, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="w-full h-full flex items-center gap-3 px-4"
    {...props}
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(52,211,153,0.4)] border border-white/10">
      <Share2 size={14} strokeWidth={2.5} />
    </div>
    {/* Draggable file row — dragging out hands the file path back to the OS */}
    <div
      className="shelf-file flex flex-col overflow-hidden flex-1 cursor-grab active:cursor-grabbing"
      draggable="true"
      title="Drag to share · × to clear"
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', file?.name || 'File');
      }}
    >
      <span className="text-emerald-400 font-bold text-sm tracking-wide drop-shadow-[0_0_5px_rgba(52,211,153,0.4)] truncate">
        {file ? file.name : 'File Shared'}
      </span>
      {file && <span className="text-emerald-400/60 font-semibold text-[10px] tracking-wider uppercase">{file.size}</span>}
    </div>
    {/* Dismiss button — clears the shelf and returns to idle */}
    {onDismiss && (
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/60 hover:text-white/90 shrink-0 border border-white/10"
        title="Clear shelf"
        aria-label="Clear file shelf"
      >
        <span className="text-[11px] font-bold leading-none">×</span>
      </button>
    )}
  </motion.div>
));

// Feature 17: Volume Scrubber
const VolumeContent = forwardRef<HTMLDivElement, { level: number }>(({ level, ...props }, ref) => (
  <motion.div ref={ref} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full h-full flex items-center px-6 gap-4" {...props}>
    <Volume2 size={18} className="shrink-0 text-white/80" strokeWidth={2.5} />
    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden shadow-inner border border-white/5">
      <motion.div className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" animate={{ width: `${level}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
    </div>
  </motion.div>
));

const WeatherContent = forwardRef<HTMLDivElement, { isExpanded?: boolean, data?: WeatherData | null }>(({ isExpanded, data, ...props }, ref) => {
  const temp = data?.weather?.temperature ? Math.round(data.weather.temperature) + '°' : '72°';
  const city = data?.city || 'San Fran';
  const cityFull = data?.city || 'San Francisco';
  const wind = data?.weather?.windspeed ? data.weather.windspeed + ' mph' : '12 mph';
  const isDay = data?.weather?.is_day ?? 1;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full flex flex-col justify-between absolute inset-0"
      {...props}
    >
      {/* Compact View */}
      <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-between absolute inset-0 px-4">
        <div className="flex items-center gap-2">
          <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
            {isDay ? <Sun size={18} className="text-amber-400 absolute top-0 -right-1 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]" strokeWidth={2.5} /> : <Moon size={18} className="text-blue-300 absolute top-0 -right-1 drop-shadow-[0_0_5px_rgba(147,197,253,0.6)]" strokeWidth={2.5} />}
            <Cloud size={16} className="text-white absolute bottom-0 left-0 fill-white drop-shadow-md" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-[13px] leading-tight text-white tracking-wide">{temp}</span>
            <span className="text-[9px] font-semibold uppercase text-white/60 leading-none tracking-wider">{city.substring(0, 8)}</span>
          </div>
        </div>
      </motion.div>

      {/* Expanded View */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-5 flex flex-col">
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col">
            <span className="text-white/60 text-[11px] font-semibold tracking-widest uppercase mb-0.5 truncate max-w-[120px]">{cityFull}</span>
            <div className="flex items-center gap-3">
              <span className="text-[56px] font-light text-white tracking-tighter leading-none">{temp}</span>
              <div className="flex flex-col justify-center mt-2">
                <span className="text-white font-medium text-sm tracking-wide">{isDay ? 'Clear/Cloudy' : 'Clear Night'}</span>
                <span className="text-white/50 font-medium text-[11px]">-</span>
              </div>
            </div>
          </div>

          {/* Animated Icon Group */}
          <div className="relative w-16 h-16 flex items-center justify-center mr-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className={`absolute top-0 right-0 w-12 h-12 rounded-full ${isDay ? 'bg-gradient-to-tr from-amber-300 to-orange-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]' : 'bg-gradient-to-tr from-indigo-300 to-blue-500 shadow-[0_0_20px_rgba(99,102,241,0.8)]'}`}
            />
            <Cloud size={48} className="text-white absolute bottom-[-4px] left-[-8px] fill-white drop-shadow-2xl" strokeWidth={0} />
            <Cloud size={32} className="text-white/40 absolute bottom-[-2px] left-[12px] fill-white blur-[2px]" strokeWidth={0} />
          </div>
        </div>

        <div className="flex gap-2 mt-auto h-[52px]">
          <div className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors rounded-2xl flex-1 border border-white/10 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] group cursor-default">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Wind size={12} className="text-white/60 group-hover:text-white/80 transition-colors" />
              <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Wind</span>
            </div>
            <span className="text-[13px] font-bold text-white tracking-wide">{wind}</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors rounded-2xl flex-1 border border-white/10 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] group cursor-default">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Droplets size={12} className="text-sky-400/80 group-hover:text-sky-400 transition-colors" />
              <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Humidity</span>
            </div>
            <span className="text-[13px] font-bold text-white tracking-wide">45%</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors rounded-2xl flex-1 border border-white/10 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] group cursor-default">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sun size={12} className="text-amber-400/80 group-hover:text-amber-400 transition-colors" />
              <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">UV Index</span>
            </div>
            <span className="text-[13px] font-bold text-white tracking-wide">{isDay ? 'High' : 'Low'}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

const CalendarContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div ref={ref} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" {...props}>
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center gap-2.5 absolute inset-0 px-5">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-purple-400 shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.4)] text-white border border-white/10">
        <CalendarIcon size={14} strokeWidth={2.5} />
      </div>
      <span className="font-bold text-[14px] truncate text-white/90 tracking-wide">Design Sync in 5m</span>
    </motion.div>

    {/* Expanded View */}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-5 flex flex-col">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <h4 className="font-bold text-[19px] leading-tight text-white tracking-wide">Weekly Design Sync</h4>
          <p className="text-sm text-white/60 font-medium mt-0.5 tracking-wide">10:00 AM - 10:30 AM</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-purple-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-white/10">
          <Video size={20} className="text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className="mt-auto flex gap-3">
        <button className="flex-1 bg-white hover:bg-gray-100 text-black rounded-xl py-2.5 text-[15px] font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] border border-white/20">
          Join Microsoft Teams
        </button>
      </div>
    </motion.div>
  </motion.div>
));

const ControlCenterContent = forwardRef<HTMLDivElement, { onToggle?: (type: 'wifi' | 'bluetooth', state: boolean) => void }>((props, ref) => {
  const [wifiOn, setWifiOn] = useState(true);
  const [btOn, setBtOn] = useState(true);

  const toggleWifi = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !wifiOn;
    setWifiOn(next);
    if (props.onToggle) props.onToggle('wifi', next);
  };

  const toggleBt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !btOn;
    setBtOn(next);
    if (props.onToggle) props.onToggle('bluetooth', next);
  };

  return (
    <motion.div ref={ref} className="w-full h-full p-4 flex flex-col absolute inset-0 justify-center" {...props}>
      <div className="flex gap-3 h-[80px]">
        {/* WiFi */}
        <div onClick={toggleWifi} className={`flex-1 ${wifiOn ? 'bg-white/10 hover:bg-white/15' : 'bg-black/20 hover:bg-black/30'} rounded-2xl p-3 flex flex-col gap-2 items-center justify-center cursor-pointer transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-white/5 active:scale-95 group`}>
          <div className={`w-8 h-8 rounded-full ${wifiOn ? 'bg-gradient-to-tr from-blue-600 to-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-white/10 text-white/50'} flex items-center justify-center group-hover:scale-105 transition-transform`}><Wifi size={14} strokeWidth={2.5} /></div>
          <span className={`text-[10px] font-bold tracking-wide ${wifiOn ? 'text-white/90' : 'text-white/50'}`}>Wi-Fi</span>
        </div>
        {/* Bluetooth */}
        <div onClick={toggleBt} className={`flex-1 ${btOn ? 'bg-white/10 hover:bg-white/15' : 'bg-black/20 hover:bg-black/30'} rounded-2xl p-3 flex flex-col gap-2 items-center justify-center cursor-pointer transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-white/5 active:scale-95 group`}>
          <div className={`w-8 h-8 rounded-full ${btOn ? 'bg-gradient-to-tr from-blue-600 to-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-white/10 text-white/50'} flex items-center justify-center group-hover:scale-105 transition-transform`}><Bluetooth size={14} strokeWidth={2.5} /></div>
          <span className={`text-[10px] font-bold tracking-wide ${btOn ? 'text-white/90' : 'text-white/50'}`}>Bluetooth</span>
        </div>
        {/* DND */}
        <div onClick={(e) => e.stopPropagation()} className="flex-1 bg-white/10 hover:bg-white/15 rounded-2xl p-3 flex flex-col gap-2 items-center justify-center cursor-pointer transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-white/5 active:scale-95 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 text-white flex items-center justify-center shadow-[0_0_10px_rgba(79,70,229,0.4)] group-hover:scale-105 transition-transform"><Moon size={14} strokeWidth={2.5} className="fill-current" /></div>
          <span className="text-[10px] font-bold tracking-wide text-white/90">DND</span>
        </div>
      </div>
    </motion.div>
  );
});

const DropzoneContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div ref={ref} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" {...props}>
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-center absolute inset-0 px-5">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)] shrink-0 border border-white/10">
          <FileUp size={14} strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[14px] text-white/90 tracking-wide">Drop file here</span>
      </div>
    </motion.div>

    {/* Expanded View */}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-5 flex flex-col">
      <div className="w-full h-full border-2 border-dashed border-purple-400/40 rounded-3xl bg-gradient-to-br from-purple-500/10 to-transparent flex flex-col items-center justify-center gap-2.5 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)] transition-colors hover:bg-purple-500/20">
        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-1">
          <FileUp size={24} className="text-purple-400" strokeWidth={2} />
        </div>
        <span className="text-[15px] font-bold text-purple-200 tracking-wide">Ready to copy to Island</span>
        <span className="text-[11px] font-medium text-purple-300/60 uppercase tracking-widest">Drag any file from Windows</span>
      </div>
    </motion.div>
  </motion.div>
));

const VoiceChatContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div ref={ref} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" {...props}>
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-between absolute inset-0 px-5">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center relative text-white shadow-lg shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-60"></div>
          <Activity size={14} strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-sm text-white/90">3 in Voice</span>
      </div>
      <div className="flex items-center gap-1.5">
        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <motion.div animate={{ height: [6, 10, 6] }} transition={{ repeat: Infinity, duration: 1.0 }} className="w-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
      </div>
    </motion.div>

    {/* Expanded View */}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-5 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-green-400">
          <Users size={16} />
          <span className="font-semibold text-sm">Design Channel</span>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><Mic size={14} /></button>
          <button className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-colors"><PhoneOff size={14} /></button>
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        {/* User 1 Speaking */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-2 border-black">
              <span className="text-xs font-bold text-white">AJ</span>
            </div>
          </div>
          <span className="text-[10px] font-medium opacity-80">Alex</span>
        </div>
        {/* User 2 */}
        <div className="flex flex-col items-center gap-1 opacity-60">
          <div className="w-12 h-12 rounded-full bg-white/20 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-2 border-black">
              <span className="text-xs font-bold text-white">S</span>
            </div>
          </div>
          <span className="text-[10px] font-medium opacity-80">Sarah</span>
        </div>
        {/* User 3 */}
        <div className="flex flex-col items-center gap-1 opacity-60">
          <div className="w-12 h-12 rounded-full bg-white/20 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-2 border-black">
              <span className="text-xs font-bold text-white">M</span>
            </div>
          </div>
          <span className="text-[10px] font-medium opacity-80">Mike</span>
        </div>
      </div>
    </motion.div>
  </motion.div>
));

const NotificationStackContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div ref={ref} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" {...props}>
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-between absolute inset-0 px-5">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.4)]">
          <Bell size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-sm text-white/90">3 Notifications</span>
      </div>
      <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-bold border border-white/10 shadow-inner">
        3
      </div>
    </motion.div>

    {/* Expanded View */}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-4 flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm">Recent</span>
        <button className="text-xs text-white/50 hover:text-white transition-colors">Clear All</button>
      </div>
      <div className="flex flex-col gap-2 overflow-hidden">
        {/* Notification 1 */}
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0"><MessageSquare size={14} /></div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-xs font-bold truncate">Discord - General</span>
            <span className="text-[10px] opacity-70 truncate">Alex: Let's check the new design!</span>
          </div>
        </div>
        {/* Notification 2 */}
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><Mail size={14} /></div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-xs font-bold truncate">Linear</span>
            <span className="text-[10px] opacity-70 truncate">Issue #402 assigned to you</span>
          </div>
        </div>
        {/* Notification 3 */}
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0"><CheckCircle2 size={14} /></div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-xs font-bold truncate">System Update</span>
            <span className="text-[10px] opacity-70 truncate">Windows update complete.</span>
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
));
