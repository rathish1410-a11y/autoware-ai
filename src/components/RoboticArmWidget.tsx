import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Activity, CheckCircle2, RotateCw, Box } from 'lucide-react';

interface RoboticArmWidgetProps {
  activeItemSku?: string | null;
}

export const RoboticArmWidget: React.FC<RoboticArmWidgetProps> = ({ activeItemSku }) => {
  const [armState, setArmState] = useState<'IDLE' | 'RETRIEVING' | 'PLACING' | 'STAGED'>('IDLE');
  const [cycles, setCycles] = useState(142);
  const [jointAngle, setJointAngle] = useState(42);

  useEffect(() => {
    if (activeItemSku) {
      setArmState('RETRIEVING');
      const t1 = setTimeout(() => setArmState('PLACING'), 2500);
      const t2 = setTimeout(() => {
        setArmState('STAGED');
        setCycles((c) => c + 1);
      }, 5000);
      const t3 = setTimeout(() => setArmState('IDLE'), 8000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [activeItemSku]);

  useEffect(() => {
    const interval = setInterval(() => {
      setJointAngle((prev) => (prev > 90 ? 30 : prev + Math.floor(Math.random() * 8)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const stateColors = {
    IDLE: 'bg-slate-800 text-slate-300 border-slate-700',
    RETRIEVING: 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse',
    PLACING: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 animate-pulse',
    STAGED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-xl shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
            <Cpu className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-200">Robotic Arm Unit Alpha</h4>
            <p className="text-[10px] text-slate-500 font-mono">Payload Picker #01</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border font-mono ${stateColors[armState]}`}>
          {armState}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2.5 text-center font-mono">
        <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <p className="text-[9px] text-slate-500 uppercase">Joint Angle</p>
          <p className="text-xs font-bold text-cyan-400 mt-0.5">{jointAngle}°</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <p className="text-[9px] text-slate-500 uppercase">Completed</p>
          <p className="text-xs font-bold text-indigo-400 mt-0.5">{cycles} picks</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <p className="text-[9px] text-slate-500 uppercase">Active Target</p>
          <p className="text-xs font-bold text-amber-400 truncate mt-0.5">
            {activeItemSku || 'STANDBY'}
          </p>
        </div>
      </div>
    </div>
  );
};
