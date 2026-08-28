import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface AgentOffice2DProps {
  activeAgent: string | null;
}

const AGENTS = [
  { id: 'Orchestrator', color: 'bg-blue-500' },
  { id: 'Explainer', color: 'bg-emerald-500' },
  { id: 'Verifier', color: 'bg-purple-500' },
  { id: 'Challenger', color: 'bg-rose-500' }
];

export const AgentOffice2D: React.FC<AgentOffice2DProps> = ({ activeAgent }) => {
  const activeIndex = AGENTS.findIndex(a => a.id === activeAgent);
  const filePos = activeIndex !== -1 ? activeIndex : (activeAgent === 'Complete' ? 4 : 0);

  return (
    <div className="w-full bg-[#0A101C] border border-white/10 rounded-xl p-4 overflow-hidden relative shadow-inner mb-4">
      {/* Floor Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* Moving File/Folder */}
      {(activeAgent && activeAgent !== 'Complete') && (
        <motion.div 
          initial={false}
          animate={{ 
            x: filePos * 144, // Desk width (96px via w-24) + gap (48px via gap-12). 96 + 48 = 144px.
          }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          className="absolute top-16 z-40 bg-white p-1 rounded-sm shadow-xl border-2 border-slate-300"
          style={{ width: '24px', height: '30px', left: '36px' }} // 96/2 = 48, minus half width 12 = 36px offset to center
        >
          <div className="w-full h-[3px] bg-slate-300 mb-[3px]" />
          <div className="w-3/4 h-[3px] bg-slate-300 mb-[3px]" />
          <div className="w-full h-[3px] bg-slate-300" />
          {/* File Label */}
          <div className="absolute -top-6 -left-4 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm border border-emerald-400">
            PROCESSING
          </div>
        </motion.div>
      )}

      {/* Agents Row */}
      <div className="flex justify-start gap-12 items-end mt-12 relative px-4">
        {AGENTS.map((agent, index) => {
          const isActive = activeAgent === agent.id;
          const isDone = AGENTS.findIndex(a => a.id === activeAgent) > index || activeAgent === 'Complete';
          
          return (
            <div key={agent.id} className="relative flex flex-col items-center w-24">
              
              {/* Agent Avatar (Pixel Style) */}
              <motion.div 
                animate={{ 
                  y: isActive ? [0, -6, 0] : 0 
                }}
                transition={{ 
                  repeat: isActive ? Infinity : 0, 
                  duration: 0.4 
                }}
                className={cn("w-10 h-10 rounded-sm border-2 border-[#0A101C] mb-0.5 z-20 flex items-center justify-center relative", agent.color, !isActive && !isDone && "opacity-40 grayscale")}
              >
                {/* Face details */}
                <div className="w-6 h-2 bg-[#0A101C]/50 rounded-sm absolute top-2" />
                <div className="w-3 h-1 bg-[#0A101C]/30 rounded-sm absolute bottom-2" />
                
                {/* Active Sweat/Particles */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div 
                      initial={{ opacity: 0, y: 0, x: 0 }}
                      animate={{ opacity: [0, 1, 0], y: -15, x: 5 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="absolute -top-2 right-0 text-[14px] font-bold text-white/90 drop-shadow-md"
                    >
                      !
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {/* Computer Monitor */}
              <div className="absolute top-8 w-12 h-9 bg-slate-800 border-2 border-[#0A101C] rounded-sm z-30 flex items-center justify-center">
                <div className={cn("w-[90%] h-[80%] border border-slate-900", isActive ? "bg-emerald-400/30 animate-pulse" : "bg-black")} />
              </div>

              {/* Desk */}
              <div className="w-24 h-12 bg-[#5c3a21] border-t-4 border-[#8B5A2B] shadow-2xl rounded-sm relative z-10 flex flex-col items-center pt-2">
                 <div className="w-20 h-2 bg-black/20 rounded-sm" />
              </div>

              {/* Status Indicator */}
              <div className="mt-3 flex flex-col items-center">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">{agent.id}</div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {isActive ? <span className="text-emerald-400 animate-pulse">Working...</span> : 
                   isDone ? <span className="text-slate-400">Done</span> : 
                   <span>Waiting</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
