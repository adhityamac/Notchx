import { useState } from 'react';
import { motion } from 'motion/react';
import { GripVertical, Plus, Settings2, Trash2 } from 'lucide-react';

interface Rule {
  id: string;
  condition: string;
  action: string;
}

export function WorkflowBuilder() {
  const [rules, setRules] = useState<Rule[]>([
    { id: '1', condition: 'Device Plugged In', action: 'Show Battery Widget' },
    { id: '2', condition: 'Time > 10:00 PM', action: 'Enable Focus Mode' },
  ]);

  const conditions = ['Device Plugged In', 'Time > 10:00 PM', 'Discord Voice Call', 'Spotify Playing', 'Low Battery'];
  const actions = ['Show Battery Widget', 'Enable Focus Mode', 'Show Voice Chat', 'Expand Music Widget', 'Show Alert'];

  const addRule = () => {
    setRules([...rules, { id: Math.random().toString(), condition: conditions[0], action: actions[0] }]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-lg font-semibold text-black/80 dark:text-white/80">Smart Rules Workflow</h4>
          <p className="text-sm text-black/60 dark:text-white/60">Drag and drop conditions to trigger Island OS widgets automatically.</p>
        </div>
        <button 
          onClick={addRule}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Rule
        </button>
      </div>

      <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-2xl p-6 overflow-y-auto border border-black/10 dark:border-white/10">
        <div className="flex flex-col gap-4">
          {rules.map((rule, index) => (
            <motion.div 
              layout
              key={rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4 bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-black/5 dark:border-white/5"
            >
              <div className="text-black/30 dark:text-white/30 cursor-grab hover:text-black/60 dark:hover:text-white/60">
                <GripVertical size={20} />
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-black/40 dark:text-white/40">If Condition</span>
                  <select 
                    value={rule.condition}
                    onChange={(e) => {
                      const newRules = [...rules];
                      newRules[index].condition = e.target.value;
                      setRules(newRules);
                    }}
                    className="bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 rounded-lg px-3 py-2 text-sm text-black/80 dark:text-white/80 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  >
                    {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-black/40 dark:text-white/40">Then Action</span>
                  <select 
                    value={rule.action}
                    onChange={(e) => {
                      const newRules = [...rules];
                      newRules[index].action = e.target.value;
                      setRules(newRules);
                    }}
                    className="bg-black/5 dark:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 rounded-lg px-3 py-2 text-sm text-black/80 dark:text-white/80 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  >
                    {actions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="p-2 text-black/40 hover:text-black/80 dark:text-white/40 dark:hover:text-white/80 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                  <Settings2 size={18} />
                </button>
                <button 
                  onClick={() => removeRule(rule.id)}
                  className="p-2 text-red-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-500/10"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
          
          {rules.length === 0 && (
            <div className="text-center py-12 text-black/40 dark:text-white/40 text-sm">
              No smart rules defined. Click "Add Rule" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}