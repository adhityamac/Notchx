import { motion, Reorder, AnimatePresence } from 'motion/react';
import { X, Shield, Cloud, Plug, Settings, Key, Smartphone, HardDrive, Lock, Workflow, Plus, Trash2, Download, CheckCircle2, Server, GripVertical, Activity, Music, Code, MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';

interface SettingsDashboardProps {
  onClose: () => void;
}

export function SettingsDashboard({ onClose }: SettingsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'security' | 'rules' | 'cloud' | 'plugins' | 'os'>('os');

  const [rules, setRules] = useState([
    { id: '1', triggers: [{ id: 't1', type: 'Device Plugged In' }], action: 'Show Battery Widget' },
    { id: '2', triggers: [{ id: 't2', type: 'Time > 10:00 PM' }, { id: 't3', type: 'Focus Mode Active' }], action: 'Dim Island Glow' },
  ]);

  const addCondition = (ruleId: string) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, triggers: [...r.triggers, { id: Math.random().toString(), type: 'New Condition' }] } : r));
  };

  const removeCondition = (ruleId: string, triggerId: string) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, triggers: r.triggers.filter(t => t.id !== triggerId) } : r));
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'os': return "OS Integration (SMTC)";
      case 'security': return "Security & Architecture";
      case 'rules': return "Smart Rules Workflow";
      case 'cloud': return "Cloud Sync & Key Vault";
      case 'plugins': return "Community Plugins";
      default: return "Settings";
    }
  }

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
          
          <SidebarButton onClick={() => setActiveTab('os')} icon={<MonitorSmartphone size={16} />} label="OS Hooking" active={activeTab === 'os'} />
          <SidebarButton onClick={() => setActiveTab('rules')} icon={<Workflow size={16} />} label="Smart Rules" active={activeTab === 'rules'} />
          <SidebarButton onClick={() => setActiveTab('plugins')} icon={<Plug size={16} />} label="Plugins" active={activeTab === 'plugins'} />
          <SidebarButton onClick={() => setActiveTab('cloud')} icon={<Cloud size={16} />} label="Cloud Sync" active={activeTab === 'cloud'} />
          <SidebarButton onClick={() => setActiveTab('security')} icon={<Shield size={16} />} label="Security" active={activeTab === 'security'} />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-14 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-6 shrink-0">
            <h3 className="font-semibold text-black/80 dark:text-white/80">{getTitle()}</h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <X size={18} className="text-black/60 dark:text-white/60" />
            </button>
          </div>

          <div className="p-8 flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="max-w-2xl mx-auto flex flex-col gap-8">
              
              {activeTab === 'os' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-2">Windows Interception Status</h4>
                    <p className="text-sm text-black/70 dark:text-white/70 mb-4">
                      Island OS requires elevated permissions to hook into Windows low-level APIs and intercept native notifications. When enabled, native toasts will be suppressed and routed directly to the Dynamic Island.
                    </p>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg w-fit">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-semibold text-black/80 dark:text-white/80">API Hook Attached</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <ToggleSetting 
                      title="Windows Notification API (Action Center)"
                      description="Intercepts all native Windows 11 Toasts (Discord, Mail, Slack) and prevents them from showing in the bottom right."
                      active={true}
                    />
                    <ToggleSetting 
                      title="SMTC (System Media Transport Controls)"
                      description="Hooks into the Windows Media overlay. Replaces the native volume and media playback OSD with the Island."
                      active={true}
                    />
                    <ToggleSetting 
                      title="Clipboard API Hook"
                      description="Listen to CTRL+C globally to show the 'Copied' confirmation."
                      active={true}
                    />
                    <ToggleSetting 
                      title="DirectX / GDI Overlay Mode"
                      description="Allows the island to render on top of exclusive fullscreen games without alt-tabbing."
                      active={false}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="text-blue-500" size={24} />
                      <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Security Architecture</h4>
                    </div>
                    <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed mb-4">
                      Island OS runs entirely locally via Electron. All system events (battery, USB, system volume) are isolated using Electron's context-isolated IPC bridge. To prevent command injection, the renderer cannot access Node.js APIs directly.
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
                        <h5 className="font-semibold text-sm mb-1">Local Edge (Electron)</h5>
                        <p className="text-xs text-black/60 dark:text-white/60">Handles hardware interactions, file dropping, and window management securely on the device.</p>
                      </div>
                      <div className="border border-indigo-500/30 rounded-xl p-5 bg-indigo-500/5">
                        <Cloud className="mb-3 text-indigo-500" size={20} />
                        <h5 className="font-semibold text-sm mb-1 text-indigo-600 dark:text-indigo-400">Cloud Backend (Needed)</h5>
                        <p className="text-xs text-black/60 dark:text-white/60">Required to sync your island settings across devices and safely store third-party API keys.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'rules' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-black/60 dark:text-white/60">Drag and drop to set logic priority. Highest rules execute first.</p>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors">
                      <Plus size={14}/> New Rule
                    </button>
                  </div>
                  
                  <Reorder.Group axis="y" values={rules} onReorder={setRules} className="flex flex-col gap-4">
                    <AnimatePresence>
                      {rules.map((rule) => (
                        <Reorder.Item key={rule.id} value={rule} className="relative">
                          <div className="bg-white/60 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-sm backdrop-blur-md">
                            <div className="flex items-start">
                              <div className="p-4 flex items-center justify-center cursor-grab active:cursor-grabbing text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60">
                                <GripVertical size={16}/>
                              </div>
                              <div className="flex-1 p-4 pl-0 flex flex-col gap-3">
                                
                                <div className="flex flex-col gap-2 relative">
                                  {rule.triggers.map((trigger, idx) => (
                                    <div key={trigger.id} className="flex items-center gap-3">
                                      {idx > 0 && <div className="flex items-center justify-center px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded text-[9px] font-bold">AND</div>}
                                      <div className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 flex items-center justify-between">
                                        <span className="text-sm font-medium">IF {trigger.type}</span>
                                        {rule.triggers.length > 1 && (
                                          <button onClick={() => removeCondition(rule.id, trigger.id)} className="text-red-500/60 hover:text-red-500"><Trash2 size={12}/></button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  <button onClick={() => addCondition(rule.id)} className="w-fit flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-blue-500 hover:bg-blue-500/10 rounded transition-colors mt-1">
                                    <Plus size={12}/> Add Condition
                                  </button>
                                </div>
                                
                                <div className="h-px bg-black/5 dark:bg-white/5 w-full" />
                                
                                <div className="flex items-center gap-3">
                                  <span className="px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded text-[10px] font-bold">THEN</span>
                                  <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{rule.action}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Reorder.Item>
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>
                </motion.div>
              )}

              {activeTab === 'cloud' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                      <Cloud size={24} className="text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">Syncing to Supabase</h4>
                      <p className="text-sm text-black/60 dark:text-white/60 mt-1">All workflows and island layout settings are securely synced.</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-black/80 dark:text-white/80 mb-3">Secure Keychain</h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Server className="text-green-500" size={18} />
                          <div>
                            <p className="text-sm font-medium">Supabase URL</p>
                            <p className="text-[10px] text-black/50 dark:text-white/50">Connected to wjb...co</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs font-semibold">
                          <CheckCircle2 size={12}/> Connected
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl opacity-70">
                        <div className="flex items-center gap-3">
                          <Key className="text-black/50 dark:text-white/50" size={18} />
                          <div>
                            <p className="text-sm font-medium">Spotify API Key</p>
                            <p className="text-[10px] text-black/50 dark:text-white/50">Required for Live Lyrics plugin</p>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-lg text-xs font-semibold transition-colors">
                          Add Key
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'plugins' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl p-5 flex flex-col relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-green-500/20 transition-all" />
                      <Music className="text-green-500 mb-3 relative z-10" size={24} />
                      <h4 className="text-sm font-bold relative z-10">Spotify Live Lyrics</h4>
                      <p className="text-xs text-black/60 dark:text-white/60 mt-1 mb-4 relative z-10 line-clamp-2">Displays real-time scrolling lyrics on the expanded Island while music plays.</p>
                      <button className="mt-auto w-full py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                        <Download size={14}/> Install
                      </button>
                    </div>

                    <div className="bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl p-5 flex flex-col relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-xl -mr-10 -mt-10 group-hover:bg-sky-500/20 transition-all" />
                      <Activity className="text-sky-500 mb-3 relative z-10" size={24} />
                      <h4 className="text-sm font-bold relative z-10">System Resource Graph</h4>
                      <p className="text-xs text-black/60 dark:text-white/60 mt-1 mb-4 relative z-10 line-clamp-2">Live CPU and RAM utilization mini-graphs right in your island.</p>
                      <button className="mt-auto w-full py-2 bg-sky-500 text-white hover:bg-sky-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                        <CheckCircle2 size={14}/> Installed
                      </button>
                    </div>
                    
                    <div className="bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl p-5 flex flex-col relative overflow-hidden group opacity-60">
                      <Code className="text-purple-500 mb-3 relative z-10" size={24} />
                      <h4 className="text-sm font-bold relative z-10">Custom Plugin SDK</h4>
                      <p className="text-xs text-black/60 dark:text-white/60 mt-1 mb-4 relative z-10 line-clamp-2">Build your own Electron + React Island plugins.</p>
                      <button className="mt-auto w-full py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                        Documentation
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SidebarButton({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
      active 
        ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' 
        : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
    }`}>
      {icon} {label}
    </button>
  );
}

function ToggleSetting({ title, description, active }: { title: string, description: string, active: boolean }) {
  const [isActive, setIsActive] = useState(active);
  return (
    <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl cursor-pointer hover:bg-white/80 dark:hover:bg-black/30 transition-colors" onClick={() => setIsActive(!isActive)}>
      <div className="flex flex-col flex-1 pr-6">
        <h5 className="font-semibold text-sm mb-1">{title}</h5>
        <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">{description}</p>
      </div>
      <div className={`w-10 h-6 rounded-full relative transition-colors ${isActive ? 'bg-green-500' : 'bg-black/20 dark:bg-white/20'}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isActive ? 'left-5' : 'left-1'}`} />
      </div>
    </div>
  );
}