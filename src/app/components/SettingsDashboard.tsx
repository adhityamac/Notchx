import { motion } from 'motion/react';
import { X, Shield, Cloud, Plug, Settings, Key, Smartphone, HardDrive, Lock } from 'lucide-react';

interface SettingsDashboardProps {
  onClose: () => void;
}

export function SettingsDashboard({ onClose }: SettingsDashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm pointer-events-auto"
    >
      <div className="w-full max-w-4xl h-[600px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-64 bg-black/5 dark:bg-white/5 border-r border-black/10 dark:border-white/10 p-4 flex flex-col gap-2">
          <div className="px-3 py-4 mb-4">
            <h2 className="text-lg font-bold text-black/80 dark:text-white/80">Island OS</h2>
            <p className="text-xs text-black/50 dark:text-white/50">v2.0.4-beta</p>
          </div>
          
          <SidebarButton icon={<Settings size={16} />} label="General" active />
          <SidebarButton icon={<Plug size={16} />} label="Integrations" />
          <SidebarButton icon={<Cloud size={16} />} label="Cloud Sync" />
          <SidebarButton icon={<Shield size={16} />} label="Security" />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-6">
            <h3 className="font-semibold text-black/80 dark:text-white/80">Security & Architecture</h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <X size={18} className="text-black/60 dark:text-white/60" />
            </button>
          </div>

          <div className="p-8 flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto flex flex-col gap-8">
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="text-blue-500" size={24} />
                  <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Security Architecture</h4>
                </div>
                <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed mb-4">
                  Currently, Island OS runs entirely locally via Tauri (Rust). All system events (battery, USB, system volume) are isolated using Tauri's IPC bridge. To prevent command injection, the frontend cannot execute arbitrary shell commands.
                </p>
                <div className="flex gap-4">
                  <div className="flex-1 bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-1 text-green-600 dark:text-green-400">
                      <Lock size={14} /> <span className="text-xs font-bold uppercase">IPC Bridge</span>
                    </div>
                    <p className="text-[10px] text-black/60 dark:text-white/60">Strictly typed messages between React and Windows APIs.</p>
                  </div>
                  <div className="flex-1 bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-1 text-amber-600 dark:text-amber-400">
                      <Key size={14} /> <span className="text-xs font-bold uppercase">OAuth Storage</span>
                    </div>
                    <p className="text-[10px] text-black/60 dark:text-white/60">Requires a secure backend to store Spotify/Discord tokens.</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-black/80 dark:text-white/80 mb-4">Local vs Cloud Backend</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-black/10 dark:border-white/10 rounded-xl p-5 bg-white/30 dark:bg-black/20">
                    <HardDrive className="mb-3 text-black/50 dark:text-white/50" size={20} />
                    <h5 className="font-semibold text-sm mb-1">Local Edge (Rust)</h5>
                    <p className="text-xs text-black/60 dark:text-white/60">Handles hardware interactions, file dropping, and window management securely on the device.</p>
                  </div>
                  <div className="border border-indigo-500/30 rounded-xl p-5 bg-indigo-500/5">
                    <Cloud className="mb-3 text-indigo-500" size={20} />
                    <h5 className="font-semibold text-sm mb-1 text-indigo-600 dark:text-indigo-400">Cloud Backend (Needed)</h5>
                    <p className="text-xs text-black/60 dark:text-white/60">Required to sync your island settings across devices and safely store third-party API keys.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SidebarButton({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
      active 
        ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' 
        : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
    }`}>
      {icon} {label}
    </button>
  );
}