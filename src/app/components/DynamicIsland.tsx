import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useState, useEffect, forwardRef, useRef } from 'react';
import { Phone, PhoneOff, Timer, Bell, Music2, BatteryCharging, Download, Bluetooth, Send, Copy, Share2, Volume2, Mic, Camera } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export type IslandState = 'idle' | 'music' | 'timer' | 'call' | 'notification' | 'battery' | 'download' | 'bluetooth' | 'split' | 'progress_edge' | 'copied' | 'shared' | 'volume';

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
}

// Dimensions for the different states
const stateStyles: Record<IslandState | 'music_expanded', any> = {
  idle: { width: 180, height: 40, borderRadius: 24, top: 12 },
  music: { width: 300, height: 40, borderRadius: 24, top: 12 },
  music_expanded: { width: 380, height: 200, borderRadius: 36, top: 12 },
  timer: { width: 240, height: 40, borderRadius: 24, top: 12 },
  call: { width: 360, height: 84, borderRadius: 36, top: 12 },
  notification: { width: 360, height: 120, borderRadius: 36, top: 12 }, // Taller for Quick Reply
  battery: { width: 220, height: 40, borderRadius: 24, top: 12 },
  download: { width: 280, height: 40, borderRadius: 24, top: 12 },
  bluetooth: { width: 240, height: 40, borderRadius: 24, top: 12 },
  split: { width: 320, height: 40, borderRadius: 24, top: 12, backgroundColor: 'transparent', boxShadow: 'none', ring: 'none' }, // Wrapper for split
  progress_edge: { width: '100%', height: 4, borderRadius: 0, top: 0 },
  copied: { width: 260, height: 40, borderRadius: 24, top: 12 },
  shared: { width: 220, height: 40, borderRadius: 24, top: 12 },
  volume: { width: 240, height: 40, borderRadius: 24, top: 12 },
};

// Subtle glows depending on the active context
const glowStyles: Record<string, string> = {
  music_expanded: '0px 10px 40px rgba(255,255,255,0.15)',
  timer: '0px 8px 30px rgba(249,115,22,0.2)',
  call: '0px 8px 30px rgba(34,197,94,0.2)',
  battery: '0px 8px 30px rgba(34,197,94,0.15)',
  bluetooth: '0px 8px 30px rgba(59,130,246,0.2)',
  download: '0px 8px 30px rgba(59,130,246,0.2)',
  progress_edge: '0px 2px 20px rgba(59,130,246,0.8)',
  volume: '0px 8px 30px rgba(255,255,255,0.1)',
  split: 'none',
  default: '0px 10px 30px rgba(0,0,0,0.5)',
};

const springTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.9,
};

export const DynamicIsland = ({ 
  activeState, onClick, isExpanded, focusMode, 
  cameraActive, micActive, copiedText, volumeLevel = 50, setVolumeLevel, onHoverPeek 
}: DynamicIslandProps) => {
  
  const currentState = (activeState === 'music' && isExpanded) ? 'music_expanded' : activeState;
  
  // Focus Mode shrinks the island slightly and dims glow
  const baseStyle = stateStyles[currentState] || stateStyles.idle;
  const currentGlow = focusMode ? 'none' : (glowStyles[currentState] || glowStyles.default);
  const currentWidth = focusMode && typeof baseStyle.width === 'number' ? baseStyle.width * 0.9 : baseStyle.width;
  
  // Feature 4: Cursor Magnetism
  const islandRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const magneticX = useSpring(mouseX, springConfig);
  const magneticY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!islandRef.current || currentState === 'progress_edge') return;
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
        top: baseStyle.top,
        boxShadow: isDraggedOver ? '0px 0px 40px rgba(59,130,246,0.6)' : currentGlow,
        scale: isDraggedOver ? 1.05 : 1
      }}
      whileHover={{ scale: currentState === 'progress_edge' ? 1 : 1.02 }}
      whileTap={{ scale: currentState === 'progress_edge' ? 1 : 0.98 }}
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
        bg-[#000000] backdrop-blur-xl text-white overflow-hidden relative z-50 cursor-pointer mx-auto
        ${currentState === 'progress_edge' ? '' : 'ring-1 ring-white/10 flex items-center justify-center'}
      `}
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
        {activeState === 'battery' && <BatteryContent key="battery" />}
        {activeState === 'download' && <DownloadContent key="download" />}
        {activeState === 'bluetooth' && <BluetoothContent key="bluetooth" />}
        {activeState === 'progress_edge' && <ProgressEdgeContent key="progress_edge" />}
        {activeState === 'copied' && <CopiedContent key="copied" text={copiedText} />}
        {activeState === 'shared' && <SharedContent key="shared" />}
        {activeState === 'volume' && <VolumeContent key="volume" level={volumeLevel} />}
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
    <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center pointer-events-none ml-auto mr-12">
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
            <span className="text-white font-semibold text-lg leading-tight">Midnight City</span>
            <span className="text-white/60 text-sm">M83</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer group relative">
             <motion.div 
               className="h-full bg-white rounded-full group-hover:bg-blue-400 transition-colors" 
               initial={{ width: '0%' }} animate={{ width: '45%' }} transition={{ duration: 1 }}
             />
          </div>
          <div className="flex justify-between text-xs text-white/50 px-1 font-medium">
            <span>1:42</span>
            <span>-2:21</span>
          </div>
          <div className="flex items-center justify-center gap-8 mt-1">
            <button className="text-white/80 hover:text-white transition-transform active:scale-95">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="19 20 9 12 19 4 19 20"></polygon></svg>
            </button>
            <button className="text-black bg-white p-3.5 rounded-full hover:scale-105 active:scale-95 transition-all">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            </button>
             <button className="text-white/80 hover:text-white transition-transform active:scale-95">
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

const BatteryContent = forwardRef<HTMLDivElement>((props, ref) => (
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
      <BatteryCharging size={18} className="text-green-500 animate-pulse" />
      <span className="text-white/80 text-xs font-medium uppercase tracking-widest">Charging</span>
    </div>
    <div className="text-green-500 font-semibold text-sm">
      68%
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

// Feature 13: Progress Bar Edge
const ProgressEdgeContent = forwardRef<HTMLDivElement>((props, ref) => (
  <motion.div ref={ref} className="w-full h-full bg-blue-500 relative overflow-hidden" {...props}>
    <motion.div 
      className="absolute top-0 left-0 h-full bg-white/40"
      initial={{ width: '0%' }} animate={{ width: '100%' }}
      transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
    />
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
    <Volume2 size={16} className="text-white shrink-0" />
    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
      <motion.div className="h-full bg-white rounded-full" animate={{ width: `${level}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
    </div>
  </motion.div>
));
