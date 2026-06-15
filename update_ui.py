import re

def update_dynamic_island():
    with open('src/app/components/DynamicIsland.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Physics
    content = content.replace("stiffness: 420,", "stiffness: 500,")
    content = content.replace("damping: 28,", "damping: 30,")
    
    # 2. Add Idle Breathe & Content crossfades
    content = re.sub(
        r'const IdleContent = forwardRef<HTMLDivElement>\(\(props, ref\) => \{\n\s*const \[time, setTime\] = useState\(\(\) => new Date\(\)\.toLocaleTimeString\(\[\], \{ hour: \'2-digit\', minute: \'2-digit\' \}\)\);\n\n\s*useEffect\(\(\) => \{\n\s*const timer = setInterval\(\(\) => \{\n\s*setTime\(new Date\(\)\.toLocaleTimeString\(\[\], \{ hour: \'2-digit\', minute: \'2-digit\' \}\)\);\n\s*\}, 1000\);\n\s*return \(\) => clearInterval\(timer\);\n\s*\}, \[\]\);\n\n\s*return \(\n\s*<motion\.div\n\s*ref=\{ref\}\n\s*initial=\{\{ opacity: 0 \}\}\n\s*animate=\{\{ opacity: 1 \}\}\n\s*exit=\{\{ opacity: 0 \}\}\n\s*transition=\{springTransition\}\n\s*className="w-full h-full flex items-center justify-between px-3 select-none"\n\s*\{...props\}\n\s*>',
        r'''const IdleContent = forwardRef<HTMLDivElement>((props, ref) => {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, boxShadow: ['0px 0px 0px rgba(0,0,0,0)', '0px 0px 15px rgba(255,255,255,0.03)', '0px 0px 0px rgba(0,0,0,0)'] }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ ...springTransition, boxShadow: { repeat: Infinity, duration: 4, ease: "easeInOut" } }}
      className="w-full h-full flex items-center justify-between px-4 select-none"
      {...props}
    >''',
        content
    )

    # Convert generic content exit/enter
    content = re.sub(
        r'initial=\{\{ opacity: 0, scale: 0\.9 \}\}\s*animate=\{\{ opacity: 1, scale: 1 \}\}\s*exit=\{\{ opacity: 0, scale: 0\.9 \}\}\s*transition=\{\{ duration: 0\.2 \}\}',
        r'initial={{ opacity: 0, scale: 0.8 }}\n    animate={{ opacity: 1, scale: 1 }}\n    exit={{ opacity: 0, scale: 0.8 }}\n    transition={{ duration: 0.25, ease: "easeOut" }}',
        content
    )

    # 3. Enhance Music Expanded UI
    music_ui_search = r'if \(isExpanded\) \{\s*return \(\s*<motion\.div.*?className="w-full h-full flex flex-col p-4 justify-between" ref=\{ref\} \{...props\}>\s*<div className="flex items-center gap-4">\s*<img src=\{media\?\.thumbnail.*?/>\s*<div className="flex-1 overflow-hidden">\s*<div className="text-white font-medium truncate text-lg">\{media\?\.title \|\| "Starboy"\}</div>\s*<div className="text-white/60 text-sm truncate">\{media\?\.artist \|\| "The Weeknd"\}</div>\s*</div>\s*</div>\s*<div className="w-full h-1\.5 bg-white/20.*?/>\s*</div>\s*<div className="flex justify-between items-center text-\[10px\] text-white/40 mt-1 px-1">\s*<span>\{formatTime\(media\?\.position \|\| \(progress/100\)\*duration\)\}</span>\s*<span>\{formatTime\(duration\)\}</span>\s*</div>\s*<div className="flex items-center justify-between px-6">\s*<Shuffle.*?</button>\s*</div>\s*</motion\.div>\s*\);\s*\}'
    music_ui_replace = r"""if (isExpanded) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full h-full flex flex-col p-5 justify-between relative overflow-hidden group"
          ref={ref}
          {...props}
        >
          {/* Subtle blurred background of the album art */}
          <div 
            className="absolute inset-0 opacity-20 scale-150 blur-3xl -z-10"
            style={{ 
              backgroundImage: `url(${media?.thumbnail || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop"})`, 
              backgroundSize: 'cover' 
            }}
          />

          <div className="flex items-center gap-5 z-10">
            <motion.img
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
              src={media?.thumbnail || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop"}
              className="w-16 h-16 rounded-2xl object-cover shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
              alt="Album Art"
            />
            <div className="flex-1 overflow-hidden">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="text-white font-medium text-lg whitespace-nowrap overflow-hidden text-ellipsis"
              >
                <div className="inline-block hover:animate-[marquee_5s_linear_infinite]">{media?.title || "Starboy"}</div>
              </motion.div>
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring" }}
                className="text-white/60 text-sm truncate"
              >
                {media?.artist || "The Weeknd"}
              </motion.div>
            </div>
          </div>

          <div className="mt-2 z-10">
            <motion.div 
              className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative" 
              onClick={handleSeek}
              whileHover={{ height: 6 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <motion.div 
                className="absolute top-0 left-0 h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 1 }}
              />
            </motion.div>
            <div className="flex justify-between items-center text-[10px] text-white/50 mt-1.5 px-1 font-medium tracking-wider">
              <span>{formatTime(media?.position || (progress/100)*duration)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 z-10 mt-1">
            <Shuffle size={18} className={isShuffle ? "text-[#A855F7] cursor-pointer" : "text-white/40 hover:text-white/80 cursor-pointer"} onClick={(e) => { e.stopPropagation(); setIsShuffle(!isShuffle); if (onMediaControl) onMediaControl('shuffle', !isShuffle); }} />
            
            <motion.button onClick={handlePrev} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-white/80 hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </motion.button>
            
            <motion.button 
              onClick={handlePlayPause} 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-[0_5px_15px_rgba(255,255,255,0.3)] transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="black" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.g key="pause" initial={{ opacity: 0, rotate: -90, scale: 0.5 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 90, scale: 0.5 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </motion.g>
                ) : (
                  <motion.g key="play" initial={{ opacity: 0, rotate: 90, scale: 0.5 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: -90, scale: 0.5 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </motion.g>
                )}
                </AnimatePresence>
              </svg>
            </motion.button>

            <motion.button onClick={handleNext} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-white/80 hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </motion.button>

            <Repeat size={18} className={repeatMode !== 'off' ? "text-[#A855F7] cursor-pointer" : "text-white/40 hover:text-white/80 cursor-pointer"} onClick={(e) => { e.stopPropagation(); const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off'; setRepeatMode(next); if (onMediaControl) onMediaControl('repeat', next); }} />
          </div>
        </motion.div>
      );
    }"""
    content = re.sub(music_ui_search, music_ui_replace, content, flags=re.DOTALL)
    content = content.replace("music_expanded: '0px 10px 40px rgba(255,255,255,0.15)',", "music_expanded: '0px 20px 60px rgba(168,85,247,0.3)',")

    # 4. Enhance Battery UI
    battery_ui_search = r'const BatteryContent = forwardRef<HTMLDivElement, \{ batteryLevel: number \}>\(\(\{ batteryLevel, \.\.\.props \}, ref\) => \(\s*<motion\.div\s*ref=\{ref\}\s*initial=\{\{ opacity: 0, scale: 0\.8 \}\}\s*animate=\{\{ opacity: 1, scale: 1 \}\}\s*exit=\{\{ opacity: 0, scale: 0\.8 \}\}\s*transition=\{\{ duration: 0\.25, ease: "easeOut" \}\}\s*className="w-full h-full flex items-center justify-between px-5 absolute inset-0"\s*\{...props\}\s*>\s*<div className="flex items-center gap-2\.5">.*?<div className=\{`\$\{batteryLevel < 20 \? \'text-rose-500\' : batteryLevel < 90 \? \'text-amber-400\' : \'text-emerald-400\'\} font-bold text-sm tracking-wide`\}>\s*\{batteryLevel\}%\s*</div>\s*</motion\.div>\s*\)\);'
    battery_ui_replace = r"""const BatteryContent = forwardRef<HTMLDivElement, { batteryLevel: number }>(({ batteryLevel, ...props }, ref) => {
  const isLow = batteryLevel < 20;
  const isCharging = batteryLevel < 100; // Simulated
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`w-full h-full flex items-center justify-between px-5 absolute inset-0 ${isLow ? 'bg-rose-500/10' : ''}`}
      {...props}
    >
      <div className="flex items-center gap-3">
        <div className={`relative w-8 h-[14px] rounded-[4px] border-[1.5px] ${isLow ? 'border-rose-500' : 'border-white/50'} flex items-center justify-start p-[1.5px]`}>
          <div className={`absolute -right-1.5 w-1 h-1.5 rounded-r-[2px] ${isLow ? 'bg-rose-500' : 'bg-white/50'}`} />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${batteryLevel}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className={`h-full rounded-[1.5px] ${isLow ? 'bg-rose-500' : isCharging ? 'bg-[#34C759]' : 'bg-white'}`}
          />
          {isCharging && !isLow && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
              className="absolute inset-0 flex items-center justify-center text-black"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-[0_0_2px_rgba(0,0,0,1)]"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </motion.div>
          )}
        </div>
        <span className="text-white/80 text-[11px] font-semibold tracking-widest mt-0.5">
          {batteryLevel === 100 ? 'CHARGED' : 'BATTERY'}
        </span>
      </div>
      <motion.div 
        animate={isLow ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ repeat: isLow ? Infinity : 0, duration: 1 }}
        className={`${isLow ? 'text-rose-500' : isCharging ? 'text-[#34C759]' : 'text-white'} font-semibold text-[15px] tracking-wide`}
      >
        {batteryLevel}%
      </motion.div>
    </motion.div>
  );
});"""
    content = re.sub(battery_ui_search, battery_ui_replace, content, flags=re.DOTALL)

    # 5. Device UI Liquid Rings
    device_ui_search = r'const DeviceContent = forwardRef<HTMLDivElement, \{ stats\?: \{ cpuUsage: number, ramUsage: number, totalMemStr: string \} \}>\(\(\{ stats, \.\.\.props \}, ref\) => \(\s*<motion\.div.*?className="w-full h-full flex flex-col justify-center px-6 absolute inset-0 gap-1"\s*\{...props\}\s*>\s*<div className="flex items-center justify-between">.*?<div className="flex flex-col flex-1 gap-1">\s*<div className="flex justify-between text-\[9px\] font-bold text-white/60">\s*<span>RAM</span>\s*<span>\{stats\?\.ramUsage \|\| 0\}%</span>\s*</div>\s*<div className="h-1 bg-white/10 rounded-full overflow-hidden">\s*<motion\.div className="h-full bg-indigo-500 rounded-full" animate=\{\{ width: `\$\{stats\?\.ramUsage \|\| 0\}%` \}\} transition=\{\{ ease: \'easeOut\' \}\} />\s*</div>\s*</div>\s*</div>\s*</motion\.div>\s*\)\);'
    device_ui_replace = r"""const DeviceContent = forwardRef<HTMLDivElement, { stats?: { cpuUsage: number, ramUsage: number, totalMemStr: string } }>(({ stats, ...props }, ref) => {
  const cpu = stats?.cpuUsage || 0;
  const ram = stats?.ramUsage || 0;
  const isHighCpu = cpu > 85;
  const isHighRam = ram > 85;
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`w-full h-full flex flex-col justify-center px-5 absolute inset-0 gap-1.5 ${isHighCpu ? 'bg-orange-500/10' : ''}`}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className={isHighCpu ? "text-orange-400" : "text-white/80"} />
          <span className="text-white font-semibold text-[11px] tracking-wide">SYSTEM ACTIVITY</span>
        </div>
        <span className="text-white/50 text-[10px] tracking-widest font-mono font-medium">{stats?.totalMemStr || '0GB'} RAM</span>
      </div>
      
      <div className="flex items-center gap-4 w-full px-1">
        <div className="flex flex-col flex-1 gap-1">
          <div className="flex justify-between text-[9px] font-bold text-white/50 uppercase tracking-wider">
            <span>CPU</span>
            <motion.span animate={{ color: isHighCpu ? '#fb923c' : '#ffffff' }}>{cpu}%</motion.span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className={`h-full rounded-full ${isHighCpu ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'bg-gradient-to-r from-sky-400 to-blue-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]'}`}
              animate={{ width: `${cpu}%` }} 
              transition={{ type: 'spring', stiffness: 100, damping: 20 }} 
            />
          </div>
        </div>
        
        <div className="flex flex-col flex-1 gap-1">
          <div className="flex justify-between text-[9px] font-bold text-white/50 uppercase tracking-wider">
            <span>Memory</span>
            <motion.span animate={{ color: isHighRam ? '#a855f7' : '#ffffff' }}>{ram}%</motion.span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className={`h-full rounded-full ${isHighRam ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-[0_0_8px_rgba(129,140,248,0.5)]'}`}
              animate={{ width: `${ram}%` }} 
              transition={{ type: 'spring', stiffness: 100, damping: 20 }} 
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
});"""
    content = re.sub(device_ui_search, device_ui_replace, content, flags=re.DOTALL)

    # 6. Dropzone UI
    dropzone_ui_search = r'const DropzoneContent = forwardRef<HTMLDivElement, \{ isExpanded\?: boolean \}>\(\(\{ isExpanded, \.\.\.props \}, ref\) => \(\s*<motion\.div ref=\{ref\} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" \{...props\}>\s*\{/\* Compact View \*/\}\s*<motion\.div animate=\{\{ opacity: isExpanded \? 0 : 1 \}\} style=\{\{ pointerEvents: isExpanded \? \'none\' : \'auto\' \}\} className="w-full h-full flex items-center justify-center absolute inset-0 px-5">\s*<div className="flex items-center gap-2\.5">\s*<div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-purple-400 text-white shadow-\[0_0_10px_rgba\(168,85,247,0\.4\)\] shrink-0 border border-white/10">\s*<FileUp size=\{14\} strokeWidth=\{2\.5\} />\s*</div>\s*<span className="font-bold text-\[14px\] text-white/90 tracking-wide">Drop file here</span>\s*</div>\s*</motion\.div>\s*\{/\* Expanded View \*/\}\s*<motion\.div initial=\{\{ opacity: 0 \}\} animate=\{\{ opacity: isExpanded \? 1 : 0 \}\} style=\{\{ pointerEvents: isExpanded \? \'auto\' : \'none\' \}\} className="absolute inset-0 p-5 flex flex-col">\s*<div className="w-full h-full border-2 border-dashed border-purple-400/40 rounded-3xl bg-gradient-to-br from-purple-500/10 to-transparent flex flex-col items-center justify-center gap-2\.5 shadow-\[inset_0_0_20px_rgba\(168,85,247,0\.1\)\] transition-colors hover:bg-purple-500/20">\s*<div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-1">\s*<FileUp size=\{24\} className="text-purple-400" strokeWidth=\{2\} />\s*</div>\s*<span className="text-\[15px\] font-bold text-purple-200 tracking-wide">Ready to copy to Island</span>\s*<span className="text-\[11px\] font-medium text-purple-300/60 uppercase tracking-widest">Drag any file from Windows</span>\s*</div>\s*</motion\.div>\s*</motion\.div>\s*\)\);'
    dropzone_ui_replace = r"""const DropzoneContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div 
    ref={ref} 
    className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2 group" 
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    {...props}
  >
    <motion.div 
      className="absolute inset-1.5 border-[2px] border-dashed border-purple-400/50 rounded-full pointer-events-none"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
    />
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-center absolute inset-0 px-5 z-10">
      <div className="flex items-center gap-3">
        <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] shrink-0 border border-white/20">
          <FileUp size={16} strokeWidth={2.5} />
        </motion.div>
        <span className="font-bold text-[14px] text-white tracking-widest uppercase">Drop file here</span>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-3 flex flex-col z-10">
      <div className="w-full h-full border-2 border-dashed border-purple-400/0 rounded-[30px] bg-purple-500/10 flex flex-col items-center justify-center gap-2 shadow-[inset_0_0_30px_rgba(168,85,247,0.15)] transition-colors hover:bg-purple-500/20 relative overflow-hidden">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-400/30">
          <FileUp size={28} className="text-purple-300 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]" strokeWidth={2} />
        </motion.div>
        <span className="text-[16px] font-bold text-white tracking-wide">Ready to copy</span>
        <span className="text-[10px] font-bold text-purple-300/80 uppercase tracking-[0.2em]">Release mouse to save</span>
      </div>
    </motion.div>
  </motion.div>
));"""
    content = re.sub(dropzone_ui_search, dropzone_ui_replace, content, flags=re.DOTALL)

    # 7. Stack UI
    notif_stack_search = r'const NotificationStackContent = forwardRef<HTMLDivElement, \{ isExpanded\?: boolean \}>\(\(\{ isExpanded, \.\.\.props \}, ref\) => \(\s*<motion\.div ref=\{ref\} className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" \{...props\}>\s*\{/\* Compact View \*/\}\s*<motion\.div animate=\{\{ opacity: isExpanded \? 0 : 1 \}\} style=\{\{ pointerEvents: isExpanded \? \'none\' : \'auto\' \}\} className="w-full h-full flex items-center justify-between absolute inset-0 px-5">\s*<div className="flex items-center gap-2\.5">\s*<div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center shrink-0 shadow-lg">\s*<Bell size=\{14\} strokeWidth=\{2\.5\} />\s*</div>\s*<span className="font-semibold text-sm text-white/90">3 Notifications</span>\s*</div>\s*</motion\.div>'
    notif_stack_replace = r"""const NotificationStackContent = forwardRef<HTMLDivElement, { isExpanded?: boolean }>(({ isExpanded, ...props }, ref) => (
  <motion.div 
    ref={ref} 
    className="w-full h-full flex flex-col justify-between absolute inset-0 px-4 py-2" 
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    {...props}
  >
    <motion.div animate={{ opacity: isExpanded ? 0 : 1 }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} className="w-full h-full flex items-center justify-between absolute inset-0 px-5 z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.5)] border border-white/20">
          <Bell size={14} strokeWidth={2.5} className="animate-[wiggle_2s_ease-in-out_infinite]" />
        </div>
        <span className="font-bold text-[13px] text-white tracking-wide">3 Notifications</span>
      </div>
    </motion.div>"""
    content = re.sub(notif_stack_search, notif_stack_replace, content, flags=re.DOTALL)
    
    notif_stack_expanded_search = r'\{/\* Expanded View \*/\}\s*<motion\.div initial=\{\{ opacity: 0 \}\} animate=\{\{ opacity: isExpanded \? 1 : 0 \}\} style=\{\{ pointerEvents: isExpanded \? \'auto\' : \'none\' \}\} className="absolute inset-0 p-4 flex flex-col gap-2 overflow-hidden">\s*<div className="flex items-center justify-between px-2 mb-1">\s*<span className="text-white/50 text-\[10px\] font-bold uppercase tracking-widest">Recent Alerts</span>\s*<span className="text-white/30 text-\[10px\] font-bold uppercase cursor-pointer hover:text-white/80">Clear All</span>\s*</div>\s*\{/\* Stacked Cards \*/\}\s*<div className="relative flex-1">\s*\{/\* Card 1 \(Bottom\) \*/\}\s*<motion\.div className="absolute top-0 left-0 w-full h-16 bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-sm"\s*animate=\{\{ y: isExpanded \? 120 : 0, scale: isExpanded \? 1 : 0\.9, opacity: isExpanded \? 1 : 0 \}\}\s*transition=\{\{ type: "spring", stiffness: 300, damping: 25 \}\}>\s*<div className="w-10 h-10 rounded-xl bg-\[#0088cc\] text-white flex items-center justify-center shrink-0"><Send size=\{16\} /></div>\s*<div className="flex flex-col"><span className="text-white text-sm font-bold">Telegram</span><span className="text-white/60 text-xs truncate">New message from Boss</span></div>\s*</motion\.div>\s*\{/\* Card 2 \(Middle\) \*/\}\s*<motion\.div className="absolute top-0 left-0 w-full h-16 bg-white/10 border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-md backdrop-blur-md"\s*animate=\{\{ y: isExpanded \? 60 : 0, scale: isExpanded \? 1 : 0\.95, opacity: isExpanded \? 1 : 0 \}\}\s*transition=\{\{ type: "spring", stiffness: 300, damping: 25 \}\}>\s*<div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0"><Mail size=\{16\} /></div>\s*<div className="flex flex-col"><span className="text-white text-sm font-bold">Mail</span><span className="text-white/60 text-xs truncate">Meeting rescheduled</span></div>\s*</motion\.div>\s*\{/\* Card 3 \(Top\) \*/\}\s*<motion\.div className="absolute top-0 left-0 w-full h-16 bg-white/15 border border-white/20 rounded-2xl p-3 flex items-center gap-3 shadow-lg backdrop-blur-lg"\s*animate=\{\{ y: isExpanded \? 0 : 0, scale: 1, opacity: isExpanded \? 1 : 1 \}\}\s*transition=\{\{ type: "spring", stiffness: 300, damping: 25 \}\}>\s*<div className="w-10 h-10 rounded-xl bg-\[#5865F2\] text-white flex items-center justify-center shrink-0"><MessageSquare size=\{16\} /></div>\s*<div className="flex flex-col"><span className="text-white text-sm font-bold">Discord</span><span className="text-white/60 text-xs truncate">Are we still on for the raid\?</span></div>\s*</motion\.div>\s*</div>\s*</motion\.div>'
    notif_stack_expanded_replace = r"""{/* Expanded View */}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExpanded ? 1 : 0 }} style={{ pointerEvents: isExpanded ? 'auto' : 'none' }} className="absolute inset-0 p-4 flex flex-col gap-2 overflow-hidden z-10">
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Recent Alerts</span>
        <span className="text-white/40 text-[10px] font-bold uppercase cursor-pointer hover:text-white transition-colors">Clear All</span>
      </div>
      <div className="relative flex-1 perspective-1000">
        {/* Card 1 (Bottom) */}
        <motion.div className="absolute top-0 left-0 w-full h-[68px] bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3 shadow-sm"
          animate={isExpanded ? { y: 130, scale: 0.9, opacity: 0.5, rotateX: 5 } : { y: 0, scale: 0.8, opacity: 0, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.1 }}
        >
          <div className="w-11 h-11 rounded-xl bg-[#0088cc] text-white flex items-center justify-center shrink-0"><Send size={16} /></div>
          <div className="flex flex-col"><span className="text-white text-sm font-bold tracking-wide">Telegram</span><span className="text-white/60 text-xs truncate">New message from Boss</span></div>
        </motion.div>
        {/* Card 2 (Middle) */}
        <motion.div className="absolute top-0 left-0 w-full h-[68px] bg-white/10 border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-md backdrop-blur-md"
          animate={isExpanded ? { y: 65, scale: 0.95, opacity: 0.8, rotateX: 2 } : { y: 0, scale: 0.9, opacity: 0, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.05 }}
        >
          <div className="w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0"><Mail size={16} /></div>
          <div className="flex flex-col"><span className="text-white text-sm font-bold tracking-wide">Mail</span><span className="text-white/60 text-xs truncate">Meeting rescheduled</span></div>
        </motion.div>
        {/* Card 3 (Top) */}
        <motion.div className="absolute top-0 left-0 w-full h-[68px] bg-white/15 border border-white/20 rounded-2xl p-3 flex items-center gap-3 shadow-xl backdrop-blur-lg cursor-pointer"
          whileHover={{ scale: 1.02, y: -2 }}
          animate={isExpanded ? { y: 0, scale: 1, opacity: 1, rotateX: 0 } : { y: 0, scale: 1, opacity: 0, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <div className="w-11 h-11 rounded-xl bg-[#5865F2] text-white flex items-center justify-center shrink-0 shadow-[0_5px_15px_rgba(88,101,242,0.5)]"><MessageSquare size={16} /></div>
          <div className="flex flex-col"><span className="text-white text-sm font-bold tracking-wide">Discord</span><span className="text-white/80 text-xs truncate">Are we still on for the raid?</span></div>
        </motion.div>
      </div>
    </motion.div>"""
    content = re.sub(notif_stack_expanded_search, notif_stack_expanded_replace, content, flags=re.DOTALL)

    # 8. Volume Scrubber
    volume_ui_search = r'const VolumeContent = forwardRef<HTMLDivElement, \{ level: number \}>\(\(\{ level, \.\.\.props \}, ref\) => \(\s*<motion\.div ref=\{ref\} initial=\{\{ opacity: 0, scale: 0\.8 \}\} animate=\{\{ opacity: 1, scale: 1 \}\} exit=\{\{ opacity: 0, scale: 0\.8 \}\} transition=\{\{ duration: 0\.25, ease: \'easeOut\' \}\} className="w-full h-full flex items-center px-6 gap-4" \{...props\}>\s*<Volume2 size=\{18\} className="shrink-0 text-white/80" strokeWidth=\{2\.5\} />\s*<div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden shadow-inner border border-white/5">\s*<motion\.div className="h-full bg-white rounded-full shadow-\[0_0_10px_rgba\(255,255,255,0\.8\)\]" animate=\{\{ width: `\$\{level\}%` \}\} transition=\{\{ type: \'spring\', stiffness: 300, damping: 30 \}\} />\s*</div>\s*</motion\.div>\s*\)\);'
    volume_ui_replace = r"""const VolumeContent = forwardRef<HTMLDivElement, { level: number }>(({ level, ...props }, ref) => (
  <motion.div 
    ref={ref} 
    initial={{ opacity: 0, scale: 0.8 }} 
    animate={{ opacity: 1, scale: 1 }} 
    exit={{ opacity: 0, scale: 0.8 }} 
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className="w-full h-full flex items-center px-6 gap-4" 
    {...props}
  >
    <motion.div animate={{ scale: level > 80 ? 1.2 : level < 20 ? 0.8 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
      <Volume2 size={20} className={level > 80 ? "text-white" : "text-white/80"} strokeWidth={2.5} />
    </motion.div>
    <div className="flex-1 h-4 bg-white/15 rounded-full overflow-hidden shadow-inner border border-white/10 relative">
      <motion.div 
        className="absolute top-0 left-0 h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.9)]" 
        animate={{ width: `${level}%` }} 
        transition={{ type: 'spring', stiffness: 500, damping: 25 }} 
      />
    </div>
  </motion.div>
));"""
    content = re.sub(volume_ui_search, volume_ui_replace, content, flags=re.DOTALL)

    with open('src/app/components/DynamicIsland.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

def update_app_tsx():
    with open('src/app/App.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace("changeState('battery', true, 3000)", "changeState('battery', true, 2000)")
    content = content.replace("changeState('battery', false, 3000)", "changeState('battery', false, 2000)")
    content = content.replace("changeState('volume', false, 1500)", "changeState('volume', false, 2000)")
    content = content.replace('values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"', 'values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12"')

    with open('src/app/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

def update_visualizer():
    try:
        with open('src/app/components/TrueAudioVisualizer.tsx', 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace('transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}', 'transition={{ type: "spring", stiffness: 500, damping: 20 }}')
        content = content.replace('rounded-t-sm', 'rounded-full')
        with open('src/app/components/TrueAudioVisualizer.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
    except Exception as e:
        print("TrueAudioVisualizer.tsx not found, skipping visualizer update.")

def update_index_html():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    if "@keyframes notchx-bar" not in content:
        css = "\n    <style>\n      @keyframes notchx-bar {\n        from { transform: scaleY(var(--scale-from)); }\n        to { transform: scaleY(var(--scale-to)); }\n      }\n      @keyframes marquee {\n        0% { transform: translateX(0%); }\n        100% { transform: translateX(-100%); }\n      }\n    </style>"
        content = content.replace("</head>", f"{css}\n  </head>")
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

try:
    update_dynamic_island()
    update_app_tsx()
    update_visualizer()
    update_index_html()
    print("Successfully updated UI")
except Exception as e:
    print(f"Error: {e}")
