import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useState, useEffect, forwardRef, useRef } from 'react';
import { Phone, PhoneOff, Timer, Bell, Music2, BatteryCharging, Download, Bluetooth, Send, Copy, Share2, Volume2, Mic, Camera, CloudSun, Wind, Droplets, Calendar as CalendarIcon, Video, Wifi, Moon, Sun, SlidersHorizontal, BatteryMedium, BatteryFull, BatteryLow, HardDrive, FileUp, Image as ImageIcon, Save, Edit2, CheckCircle2, Activity, Users, MessageSquare, Mail, Trash2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export type IslandState = 'idle' | 'music' | 'timer' | 'call' | 'notification' | 'battery' | 'download' | 'bluetooth' | 'split' | 'copied' | 'shared' | 'volume' | 'weather' | 'calendar' | 'control_center' | 'dropzone' | 'voice_chat' | 'screenshot' | 'notification_stack' | 'usb_device';

interface DynamicIslandProps {
  activeState: IslandState;
  onClick?: () => void;
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
}

// Dimensions for the different states
const stateStyles: Record<string, any> = {
  idle: { width: 180, height: 40, borderRadius: 24, top: 12 },
  music: { width: 300, height: 40, borderRadius: 24, top: 12 },
  music_expanded: { width: 380, height: 200, borderRadius: 36, top: 12 },
  timer: { width: 240, height: 40, borderRadius: 24, top: 12 },
  call: { width: 360, height: 84, borderRadius: 36, top: 12 },
  notification: { width: 360, height: 120, borderRadius: 36, top: 12 },
  battery: { width: 220, height: 40, borderRadius: 24, top: 12 },
  download: { width: 280, height: 40, borderRadius: 24, top: 12 },
  bluetooth: { width: 240, height: 40, borderRadius: 24, top: 12 },
  split: { width: 320, height: 40, borderRadius: 24, top: 12, backgroundColor: 'transparent', boxShadow: 'none', ring: 'none' },
  copied: { width: 260, height: 40, borderRadius: 24, top: 12 },
  shared: { width: 220, height: 40, borderRadius: 24, top: 12 },
  volume: { width: 240, height: 40, borderRadius: 24, top: 12 },
  weather: { width: 140, height: 40, borderRadius: 24, top: 12 },
  weather_expanded: { width: 340, height: 140, borderRadius: 36, top: 12 },
  calendar: { width: 220, height: 40, borderRadius: 24, top: 12 },
  calendar_expanded: { width: 320, height: 130, borderRadius: 36, top: 12 },
  control_center: { width: 320, height: 160, borderRadius: 36, top: 12 },
  dropzone: { width: 140, height: 40, borderRadius: 24, top: 12 },
  dropzone_expanded: { width: 320, height: 160, borderRadius: 36, top: 12 },
  voice_chat: { width: 220, height: 40, borderRadius: 24, top: 12 },
  voice_chat_expanded: { width: 340, height: 180, borderRadius: 36, top: 12 },
  screenshot: { width: 240, height: 40, borderRadius: 24, top: 12 },
  screenshot_expanded: { width: 360, height: 280, borderRadius: 36, top: 12 },
  notification_stack: { width: 200, height: 40, borderRadius: 24, top: 12 },
  notification_stack_expanded: { width: 340, height: 260, borderRadius: 36, top: 12 },
  usb_device: { width: 340, height: 60, borderRadius: 30, top: 12 },
};

// Subtle glows depending on the active context
const glowStyles: Record<string, string> = {
  music_expanded: '0px 10px 40px rgba(255,255,255,0.15)',
  timer: '0px 8px 30px rgba(249,115,22,0.2)',
  call: '0px 8px 30px rgba(34,197,94,0.2)',
  battery: '0px 8px 30px rgba(34,197,94,0.15)',
  bluetooth: '0px 8px 30px rgba(59,130,246,0.2)',
  download: '0px 8px 30px rgba(59,130,246,0.2)',
  volume: '0px 8px 30px rgba(255,255,255,0.1)',
  weather_expanded: '0px 10px 40px rgba(56,189,248,0.2)',
  calendar_expanded: '0px 10px 40px rgba(168,85,247,0.2)',
  control_center: '0px 10px 40px rgba(255,255,255,0.1)',
  dropzone_expanded: '0px 10px 40px rgba(168,85,247,0.2)',
  voice_chat: '0px 8px 30px rgba(34,197,94,0.2)',
  voice_chat_expanded: '0px 10px 40px rgba(34,197,94,0.25)',
  screenshot_expanded: '0px 10px 40px rgba(56,189,248,0.2)',
  notification_stack_expanded: '0px 10px 40px rgba(244,63,94,0.2)',
  usb_device: '0px 10px 30px rgba(255,255,255,0.2)',
  split: 'none',
  default: '0px 10px 30px rgba(0,0,0,0.5)',
};

const springTransition = {
  type: 'spring',
  stiffness: 380,
  damping: 24,
  mass: 0.8,
};

export const DynamicIsland = ({ 
  activeState, onClick, isExpanded, focusMode, 
  cameraActive, micActive, copiedText, volumeLevel = 50, setVolumeLevel, onHoverPeek,
  scaleModifier = 1, yOffset = 0, theme = 'dark', actualBattery = 100
}: DynamicIslandProps) => {
  
  let currentState = activeState as string;
  if (isExpanded) {
    if (activeState === 'music') currentState = 'music_expanded';
    if (activeState === 'weather') currentState = 'weather_expanded';
    if (activeState === 'calendar') currentState = 'calendar_expanded';
    if (activeState === 'dropzone') currentState = 'dropzone_expanded';
    if (activeState === 'voice_chat') currentState = 'voice_chat_expanded';
    if (activeState === 'screenshot') currentState = 'screenshot_expanded';
    if (activeState === 'notification_stack') currentState = 'notification_stack_expanded';
  }
  
  // Focus Mode shrinks the island slightly and dims glow
  const baseStyle = stateStyles[currentState] || stateStyles.idle;
  const currentGlow = focusMode ? 'none' : (glowStyles[currentState] || glowStyles.default);
  const currentWidth = focusMode && typeof baseStyle.width === 'number' ? baseStyle.width * 0.9 : baseStyle.width;
  
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
    if (activeState === 'music' || activeState === 'volume') {
      const delta = e.deltaY > 0 ? -5 : 5;
      if (setVolumeLevel) setVolumeLevel(Math.max(0, Math.min(100, volumeLevel + delta)));
    }
  };

  // If it's split state, we render two separate islands
  if (currentState === 'split') {
    return (
      <motion.div 
        className="relative z-50 flex gap-2 mx-auto pointer-events-none items-center justify-center h-10"
        style={{ top: baseStyle.top }}
      >
        <motion.div 
          layout 
          transition={springTransition}
          className="bg-[#000000] backdrop-blur-xl text-white overflow-hidden ring-1 ring-white/10 rounded-[24px] pointer-events-auto flex items-center px-4 gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          style={{ width: 160, height: 40 }}
        >
          <img src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop" className="w-6 h-6 rounded-full" alt="Art" />
          <div className="flex gap-0.5">
             {[1,2,3].map(i => <motion.div key={i} animate={{ height: ['4px', '12px', '4px'] }} transition={{ duration: 0.5+Math.random(), repeat: Infinity }} className="w-0.5 bg-green-500 rounded-full"/>)}
          </div>
        </motion.div>
        
        <motion.div 
          layout 
          transition={springTransition}
          className="bg-[#000000] backdrop-blur-xl text-white overflow-hidden ring-1 ring-white/10 rounded-[24px] pointer-events-auto flex items-center justify-center shadow-[0_8px_30px_rgba(249,115,22,0.2)]"
          style={{ width: 80, height: 40 }}
        >
          <div className="flex items-center gap-1 text-orange-500 font-medium text-sm">
            <Timer size={14} /> 12:05
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={islandRef}
      layout
      initial={false}
      animate={{
        width: currentWidth,
        height: baseStyle.height,
        borderRadius: baseStyle.borderRadius,
        top: (baseStyle.top as number) + yOffset,
        boxShadow: isDraggedOver ? '0px 0px 40px rgba(59,130,246,0.6)' : currentGlow,
        scale: (isDraggedOver ? 1.05 : 1) * scaleModifier
      }}
      whileHover={{ scale: 1.02 * scaleModifier }}
      whileTap={{ scale: 0.98 * scaleModifier }}
      transition={springTransition}
      onClick={onClick}
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
        position: 'absolute'
      }}
      className={`
        backdrop-blur-xl overflow-hidden relative z-50 cursor-pointer mx-auto
        ${isLightMode ? 'bg-white/90 text-black' : 'bg-[#000000] text-white'}
        ring-1 ${isLightMode ? 'ring-black/5' : 'ring-white/10'} flex items-center justify-center
      `}
      data-tauri-drag-region="true"
    >
      {/* Feature 16: Privacy Indicators */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1.5 z-50 pointer-events-none">
        {cameraActive && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>}
        {micActive && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_#f97316]"></div>}
      </div>

      <AnimatePresence mode="popLayout">
        {activeState === 'idle' && <IdleContent key="idle" />}
        {activeState === 'music' && <MusicContent key="music" isExpanded={isExpanded} />}
        {activeState === 'timer' && <TimerContent key="timer" />}
        {activeState === 'call' && <CallContent key="call" />}
        {activeState === 'notification' && <NotificationContent key="notification" />}
        {activeState === 'battery' && <BatteryContent key="battery" batteryLevel={actualBattery} />}
        {activeState === 'download' && <DownloadContent key="download" />}
        {activeState === 'bluetooth' && <BluetoothContent key="bluetooth" />}
        {activeState === 'copied' && <CopiedContent key="copied" text={copiedText} />}
        {activeState === 'shared' && <SharedContent key="shared" />}
        {activeState === 'volume' && <VolumeContent key="volume" level={volumeLevel} />}
        {activeState === 'weather' && <WeatherContent key="weather" isExpanded={isExpanded} />}
        {activeState === 'calendar' && <CalendarContent key="calendar" isExpanded={isExpanded} />}
        {activeState === 'control_center' && <ControlCenterContent key="control_center" />}
        {activeState === 'dropzone' && <DropzoneContent key="dropzone" isExpanded={isExpanded} />}
        {activeState === 'voice_chat' && <VoiceChatContent key="voice_chat" isExpanded={isExpanded} />}
        {activeState === 'screenshot' && <ScreenshotContent key="screenshot" isExpanded={isExpanded} />}
        {activeState === 'notification_stack' && <NotificationStackContent key="notification_stack" isExpanded={isExpanded} />}
        {activeState === 'usb_device' && <UsbContent key="usb_device" />}
      </AnimatePresence>
    </motion.div>
  );
};

// Sub-components for different states

const IdleContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.2 }}
    className="w-full h-full flex items-center justify-between px-4 opacity-30"
    {...props}
  >
    {/* Simulate camera lens */}
    <div className="w-4 h-4 rounded-full bg-current opacity-10 flex items-center justify-center pointer-events-none ml-auto mr-12">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/20"></div>
    </div>
  </motion.div>
));

const MusicContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => {
  const bars = [1, 2, 3, 4];
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, filter: 'blur(4px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(4px)' }}
      transition={{ duration: 0.3 }}
      className="w-full h-full flex flex-col justify-between px-3 py-2 absolute inset-0"
      {...props}
    >
      {/* Compact View */}
      <motion.div 
        className="w-full h-full flex items-center justify-between"
        animate={{ opacity: isExpanded ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        style={{ pointerEvents: isExpanded ? 'none' : 'auto' }}
      >
        <div className="flex items-center gap-2 h-full">
          <img 
            src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop" 
            alt="Album Art" 
            className="w-7 h-7 rounded-full object-cover"
          />
        </div>
        <div className="flex items-center gap-1 h-full pr-6"> {/* padding right for privacy dots */}
          {bars.map((bar) => (
            <motion.div
              key={bar}
              animate={{ height: ['4px', '12px', '4px'] }}
              transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 0.2 }}
              className="w-0.5 bg-green-500 rounded-full"
            />
          ))}
        </div>
      </motion.div>

      {/* Expanded View */}
      <motion.div 
        className="absolute inset-0 p-5 flex flex-col justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.3, delay: isExpanded ? 0.1 : 0 }}
        style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
      >
        <div className="flex items-start gap-4">
           <img 
            src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop" 
            alt="Album Art Large" 
            className="w-16 h-16 rounded-2xl object-cover shadow-md"
          />
          <div className="flex flex-col mt-1">
            <span className="font-semibold text-lg leading-tight">Midnight City</span>
            <span className="opacity-60 text-sm">M83</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <div className="w-full h-2 bg-current opacity-20 rounded-full overflow-hidden cursor-pointer group relative">
             <motion.div 
               className="h-full bg-blue-500 rounded-full" 
               initial={{ width: '0%' }} animate={{ width: '45%' }} transition={{ duration: 1 }}
             />
          </div>
          <div className="flex justify-between text-xs opacity-50 px-1 font-medium">
            <span>1:42</span>
            <span>-2:21</span>
          </div>
          <div className="flex items-center justify-center gap-8 mt-1">
            <button className="opacity-80 hover:opacity-100 transition-transform active:scale-95">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="19 20 9 12 19 4 19 20"></polygon></svg>
            </button>
            <button className="text-black bg-white dark:bg-current dark:text-white p-3.5 rounded-full hover:scale-105 active:scale-95 transition-all">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            </button>
             <button className="opacity-80 hover:opacity-100 transition-transform active:scale-95">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 4 15 12 5 20 5 4"></polygon></svg>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

const TimerContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.2 }}
    className="w-full h-full flex items-center justify-between px-3"
    {...props}
  >
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/20 text-orange-500">
      <Timer size={16} />
    </div>
    <div className="flex items-center gap-1 font-medium text-orange-500 tracking-wide pr-6">
      <span>12:05</span>
    </div>
  </motion.div>
));

const CallContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className="w-full h-full flex items-center justify-between px-4 absolute inset-0"
    {...props}
  >
    <div className="flex items-center gap-3">
      <img 
        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop" 
        alt="Caller" 
        className="w-12 h-12 rounded-full object-cover border border-white/10"
      />
      <div className="flex flex-col">
        <span className="text-white/60 text-[11px] font-medium uppercase tracking-widest mb-0.5">Incoming Call</span>
        <span className="text-white font-medium text-base">Sarah Connor</span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors">
        <PhoneOff size={20} />
      </button>
      <button className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors">
        <Phone size={20} className="fill-white" />
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
      <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shrink-0 shadow-inner">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.33-.35-.76-.53-1.09a.09.09 0 0 0-.07-.03c-1.5.26-2.94.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95.0.02.01.04.02.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.03.02.02.08-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.01.02.04.03.07.02 1.71-.53 3.44-1.33 5.24-2.65.02-.01.03-.03.03-.05.4-4.18-.46-8.08-3.1-11.95-.01-.01-.02-.02-.03-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"/></svg>
      </div>
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold text-sm">Discord - Alice</span>
          <span className="text-white/40 text-xs">now</span>
        </div>
        <span className="text-white/80 text-sm line-clamp-1 mt-0.5">Are we still on for the raid tonight?</span>
      </div>
    </div>
    <div className="flex gap-2 items-center mt-1">
      <input type="text" placeholder="Quick reply..." className="flex-1 bg-white/10 border border-white/5 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-white/40" onClick={(e) => e.stopPropagation()} />
      <button className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors" onClick={(e) => e.stopPropagation()}>
        <Send size={14} className="ml-0.5" />
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
    className="w-full h-full flex items-center justify-between px-4 absolute inset-0"
    {...props}
  >
    <div className="flex items-center gap-2">
      {batteryLevel < 20 ? (
        <BatteryLow size={18} className="text-red-500 animate-pulse" />
      ) : batteryLevel < 90 ? (
        <BatteryMedium size={18} className="text-yellow-500" />
      ) : (
        <BatteryFull size={18} className="text-green-500" />
      )}
      <span className="text-white/80 text-xs font-medium uppercase tracking-widest">
        {batteryLevel === 100 ? 'Charged' : 'Battery'}
      </span>
    </div>
    <div className={`${batteryLevel < 20 ? 'text-red-500' : batteryLevel < 90 ? 'text-yellow-500' : 'text-green-500'} font-semibold text-sm`}>
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
    className="w-full h-full flex items-center justify-between px-4 absolute inset-0 gap-3"
    {...props}
  >
    <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
      <Download size={14} className="animate-bounce" />
    </div>
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-white/90 text-xs font-medium">Tauri_Installer.msi</span>
        <span className="text-white/50 text-[10px]">1.2 GB / 4.5 GB</span>
      </div>
      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
        <motion.div className="h-full bg-blue-500 rounded-full" initial={{ width: '0%' }} animate={{ width: '30%' }} transition={{ duration: 2, ease: "linear", repeat: Infinity, repeatType: "reverse" }} />
      </div>
    </div>
  </motion.div>
));

const BluetoothContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, filter: 'blur(4px)' }}
    animate={{ opacity: 1, filter: 'blur(0px)' }}
    exit={{ opacity: 0, filter: 'blur(4px)' }}
    transition={{ duration: 0.2 }}
    className="w-full h-full flex items-center justify-center gap-3 px-4 absolute inset-0"
    {...props}
  >
    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.6)]">
      <Bluetooth size={14} className="text-white" />
    </div>
    <span className="text-white font-medium text-sm">AirPods Pro Connected</span>
  </motion.div>
));

// Feature 15: Clipboard History
const CopiedContent = forwardRef<HTMLDivElement, { text?: string }>(({ text, ...props }, ref) => (
  <motion.div ref={ref} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full h-full flex items-center justify-center gap-2 px-4" {...props}>
    <Copy size={14} className="text-white/60" />
    <span className="text-white font-medium text-sm truncate max-w-[180px]">Copied "{text}"</span>
  </motion.div>
));

// Feature 12: Drag & Drop Shared
const SharedContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div ref={ref} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full h-full flex items-center justify-center gap-2 px-4 text-green-400" {...props}>
    <Share2 size={16} />
    <span className="font-medium text-sm">File Shared</span>
  </motion.div>
));

// Feature 17: Volume Scrubber
const VolumeContent = forwardRef<HTMLDivElement, { level: number }>(({ level, ...props }, ref) => (
  <motion.div ref={ref} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full h-full flex items-center px-4 gap-3" {...props}>
    <Volume2 size={16} className="shrink-0" />
    <div className="flex-1 h-2 bg-current opacity-20 rounded-full overflow-hidden">
      <motion.div className="h-full bg-current opacity-100 rounded-full" animate={{ width: `${level}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
    </div>
  </motion.div>
));

const WeatherContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className="w-full h-full flex flex-col justify-between px-5 py-4 absolute inset-0"
    {...props}
  >
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-between absolute inset-0 px-4">
      <div className="flex items-center gap-2">
        <CloudSun size={18} className="text-sky-400" />
        <span className="font-semibold text-sm tracking-wide">72° Partly Cloudy</span>
      </div>
    </motion.div>

    {/* Expanded View */}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-5 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="font-semibold text-lg leading-tight">San Francisco</span>
          <span className="opacity-60 text-sm">72° Partly Cloudy</span>
        </div>
        <div className="flex items-center justify-center w-12 h-12 bg-sky-500/20 rounded-full">
          <CloudSun size={24} className="text-sky-400" />
        </div>
      </div>
      
      <div className="flex gap-4 mt-auto">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[10px] uppercase font-bold opacity-40 tracking-wider">Wind</span>
          <div className="flex items-center gap-1.5"><Wind size={12} className="opacity-80"/> <span className="text-xs font-medium">12 mph</span></div>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[10px] uppercase font-bold opacity-40 tracking-wider">Humidity</span>
          <div className="flex items-center gap-1.5"><Droplets size={12} className="text-sky-400"/> <span className="text-xs font-medium">45%</span></div>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[10px] uppercase font-bold opacity-40 tracking-wider">Precip</span>
          <div className="flex items-center gap-1.5"><span className="text-xs font-medium">0%</span></div>
        </div>
      </div>
    </motion.div>
  </motion.div>
));

const CalendarContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div ref={ref} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" {...props}>
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center gap-2 absolute inset-0 px-4">
      <CalendarIcon size={16} className="text-purple-400 shrink-0" />
      <span className="font-medium text-sm truncate">Design Sync in 5m</span>
    </motion.div>
    
    {/* Expanded View */}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-5 flex flex-col">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <h4 className="font-semibold text-base leading-tight">Weekly Design Sync</h4>
          <p className="text-xs opacity-60 mt-0.5">10:00 AM - 10:30 AM</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
          <Video size={18} className="text-purple-400"/>
        </div>
      </div>
      <div className="mt-auto flex gap-2">
        <button className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-xl py-2 text-sm font-medium transition-colors">
          Join Microsoft Teams
        </button>
      </div>
    </motion.div>
  </motion.div>
));

const ControlCenterContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div ref={ref} className="w-full h-full p-4 flex flex-col gap-3 absolute inset-0" {...props}>
    <div className="flex gap-3">
      {/* WiFi */}
      <div className="flex-1 bg-white/10 dark:bg-white/10 hover:bg-white/20 rounded-2xl p-3 flex flex-col gap-2 items-center justify-center cursor-pointer transition-colors shadow-inner">
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center"><Wifi size={16}/></div>
        <span className="text-[10px] font-semibold tracking-wide">Wi-Fi</span>
      </div>
      {/* Bluetooth */}
      <div className="flex-1 bg-white/10 dark:bg-white/10 hover:bg-white/20 rounded-2xl p-3 flex flex-col gap-2 items-center justify-center cursor-pointer transition-colors shadow-inner">
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center"><Bluetooth size={16}/></div>
        <span className="text-[10px] font-semibold tracking-wide">Bluetooth</span>
      </div>
      {/* DND */}
      <div className="flex-1 bg-white/10 dark:bg-white/10 hover:bg-white/20 rounded-2xl p-3 flex flex-col gap-2 items-center justify-center cursor-pointer transition-colors shadow-inner">
        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center"><Moon size={16}/></div>
        <span className="text-[10px] font-semibold tracking-wide">Do Not Disturb</span>
      </div>
    </div>
    
    <div className="bg-white/10 dark:bg-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-inner">
      <Volume2 size={16} className="opacity-80" />
      <div className="flex-1 h-2 bg-black/20 dark:bg-white/20 rounded-full overflow-hidden">
        <div className="w-[70%] h-full bg-blue-500 rounded-full" />
      </div>
    </div>
  </motion.div>
));

const DropzoneContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div ref={ref} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" {...props}>
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-between absolute inset-0 px-4">
      <div className="flex items-center gap-2">
        <FileUp size={16} className="text-purple-400" />
        <span className="font-medium text-sm">Drop file here</span>
      </div>
    </motion.div>
    
    {/* Expanded View */}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-4 flex flex-col">
      <div className="w-full h-full border-2 border-dashed border-purple-500/50 rounded-2xl bg-purple-500/10 flex flex-col items-center justify-center gap-2">
        <FileUp size={24} className="text-purple-400" />
        <span className="text-sm font-medium text-purple-200">Ready to copy to Island</span>
        <span className="text-[10px] text-purple-300/60">Drag any file from Windows</span>
      </div>
    </motion.div>
  </motion.div>
));

const VoiceChatContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div ref={ref} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" {...props}>
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-between absolute inset-0 px-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full border border-green-400 animate-ping opacity-50"></div>
          <Activity size={12} className="text-green-400" />
        </div>
        <span className="font-medium text-sm">3 in Voice</span>
      </div>
      <div className="flex items-center gap-1">
        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-green-400 rounded-full" />
        <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1 bg-green-400 rounded-full" />
        <motion.div animate={{ height: [6, 10, 6] }} transition={{ repeat: Infinity, duration: 1.0 }} className="w-1 bg-green-400 rounded-full" />
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

const ScreenshotContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div ref={ref} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" {...props}>
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-between absolute inset-0 px-4">
      <div className="flex items-center gap-2">
        <Camera size={16} className="text-sky-400" />
        <span className="font-medium text-sm">Screenshot saved</span>
      </div>
      <div className="w-8 h-6 bg-white/20 rounded border border-white/30" />
    </motion.div>
    
    {/* Expanded View */}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-4 flex flex-col gap-3">
      <div className="flex-1 w-full rounded-xl bg-gradient-to-br from-indigo-500/40 to-purple-500/40 border border-white/10 flex items-center justify-center overflow-hidden">
        {/* Fake screenshot content */}
        <div className="w-3/4 h-3/4 bg-black/40 rounded-lg shadow-2xl flex flex-col p-2">
           <div className="w-full h-2 bg-white/20 rounded mb-2"></div>
           <div className="w-1/2 h-2 bg-white/10 rounded"></div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl py-2 text-xs font-medium transition-colors">
          <Copy size={12}/> Copy
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl py-2 text-xs font-medium transition-colors">
          <Edit2 size={12}/> Edit
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 rounded-xl py-2 text-xs font-medium transition-colors">
          <Save size={12}/> Save
        </button>
      </div>
    </motion.div>
  </motion.div>
));

const NotificationStackContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div ref={ref} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" {...props}>
    {/* Compact View */}
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-between absolute inset-0 px-4">
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-rose-400" />
        <span className="font-medium text-sm">3 New Notifications</span>
      </div>
      <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
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
          <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0"><MessageSquare size={14}/></div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-xs font-bold truncate">Discord - General</span>
            <span className="text-[10px] opacity-70 truncate">Alex: Let's check the new design!</span>
          </div>
        </div>
        {/* Notification 2 */}
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><Mail size={14}/></div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-xs font-bold truncate">Linear</span>
            <span className="text-[10px] opacity-70 truncate">Issue #402 assigned to you</span>
          </div>
        </div>
        {/* Notification 3 */}
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0"><CheckCircle2 size={14}/></div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-xs font-bold truncate">System Update</span>
            <span className="text-[10px] opacity-70 truncate">Windows update complete.</span>
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
));

const UsbContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.2 }}
    className="w-full h-full flex items-center justify-between px-5 absolute inset-0"
    {...props}
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
        <HardDrive size={20} />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">T7 Shield Connected</span>
        <span className="text-[10px] text-white/60">Storage (D:) • 1.2 TB Free</span>
      </div>
    </div>
    <button className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors flex items-center gap-1.5">
      Eject
    </button>
  </motion.div>
));
