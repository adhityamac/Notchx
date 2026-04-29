import { motion } from 'motion/react';
import { Puzzle, Download, Check, Star } from 'lucide-react';

const PLUGINS = [
  { id: '1', name: 'Spotify Live Lyrics', author: '@island-os', rating: 4.8, installed: true },
  { id: '2', name: 'GitHub Action Monitor', author: '@devtools', rating: 4.9, installed: false },
  { id: '3', name: 'Pomodoro Strict', author: '@productivity', rating: 4.5, installed: true },
  { id: '4', name: 'System Resource Graph', author: '@sysadmin', rating: 4.7, installed: false },
];

export function PluginsList() {
  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-lg font-semibold text-black/80 dark:text-white/80">Community Plugins</h4>
          <p className="text-sm text-black/60 dark:text-white/60">Discover and install third-party widgets for your Island.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto">
        {PLUGINS.map((plugin) => (
          <div key={plugin.id} className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                <Puzzle size={20} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                <Star size={12} fill="currentColor" /> {plugin.rating}
              </div>
            </div>
            
            <div>
              <h5 className="font-semibold text-black/80 dark:text-white/80">{plugin.name}</h5>
              <p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">by {plugin.author}</p>
            </div>

            <div className="mt-auto pt-2">
              {plugin.installed ? (
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 rounded-lg text-xs font-medium cursor-default">
                  <Check size={14} /> Installed
                </button>
              ) : (
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm hover:shadow">
                  <Download size={14} /> Install
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}