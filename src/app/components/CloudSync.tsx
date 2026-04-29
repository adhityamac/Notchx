import { motion } from 'motion/react';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw, Key } from 'lucide-react';

export function CloudSync() {
  return (
    <div className="w-full h-full flex flex-col gap-8">
      <div>
        <h4 className="text-lg font-semibold text-black/80 dark:text-white/80">Cloud Sync & Profiles</h4>
        <p className="text-sm text-black/60 dark:text-white/60">Backup your island settings and OAuth keys securely via Supabase.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-4 p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
          <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-2">
            <CheckCircle2 size={24} />
          </div>
          <h5 className="font-semibold text-black/80 dark:text-white/80">Sync is Active</h5>
          <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">
            Your preferences, widgets, and workflows are continuously synced to your cloud account.
          </p>
          <div className="mt-auto pt-4 flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/80 dark:text-white/80 rounded-lg text-xs font-medium transition-colors">
              <RefreshCw size={14} /> Sync Now
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-2">
            <Key size={24} />
          </div>
          <h5 className="font-semibold text-black/80 dark:text-white/80">Secure Keychain</h5>
          <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">
            2 connected accounts (Spotify, Discord) are securely encrypted and stored remotely.
          </p>
          <div className="mt-auto pt-4 flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors">
              Manage Keys
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-4">
        <AlertCircle className="text-indigo-500 shrink-0 mt-0.5" size={20} />
        <div>
          <h6 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Database Connection</h6>
          <p className="text-xs text-black/60 dark:text-white/60 mt-1">
            Currently connected to <code>https://hxxx-supabase.co</code>. Using Edge Functions to handle OAuth redirects to prevent leaking keys into the Tauri application bundle.
          </p>
        </div>
      </div>
    </div>
  );
}