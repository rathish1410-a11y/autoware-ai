import React from 'react';
import { Worker, WarehouseEvent } from '../types';
import { Users, Activity, MapPin, Clock, Zap, User, Moon, Sun } from 'lucide-react';

interface WorkerActivityLogProps {
  workers: Worker[];
  recentEvents: WarehouseEvent[];
}

const eventColors: Record<string, string> = {
  received:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  moved:      'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  picked:     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  packed:     'bg-purple-500/20 text-purple-300 border-purple-500/30',
  dispatched: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  scanned:    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

const AVATAR_COLORS = [
  'from-indigo-500 to-blue-500',
  'from-cyan-500 to-teal-500',
  'from-purple-500 to-indigo-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-cyan-500',
];

export const WorkerActivityLog: React.FC<WorkerActivityLogProps> = ({ workers, recentEvents }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Worker Roster */}
      <div className="lg:col-span-1 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="p-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-md opacity-30 animate-pulse" />
              <div className="relative p-2.5 rounded-2xl bg-blue-500/20 border border-blue-500/40">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div>
              <h2 className="font-extrabold text-slate-100 text-base">Active Worker Roster</h2>
              <p className="text-xs text-slate-400">{workers.length} staff on floor right now</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {workers.map((worker, idx) => {
              const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const isNight = worker.shift === 'night';
              return (
                <div
                  key={worker.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-3.5"
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarGrad} flex items-center justify-center shrink-0 shadow-lg`}>
                    <span className="font-black text-slate-950 text-sm">{worker.name.charAt(0)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs text-slate-100 truncate">{worker.name}</h4>
                      <span className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md border ${
                        isNight
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {isNight ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                        {worker.shift.toUpperCase()}
                      </span>
                    </div>
                    {worker.zone_name ? (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-600" />
                        <span className="text-slate-300 font-medium">{worker.zone_name}</span>
                        <span className="text-slate-500 capitalize">({worker.zone_type})</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">Unassigned</p>
                    )}
                  </div>

                  {/* Online indicator */}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60 animate-pulse shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Activity Stream */}
      <div className="lg:col-span-2 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500" />

        <div className="p-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-md opacity-30 animate-pulse" />
              <div className="relative p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40">
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h2 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                Live Operational Event Stream
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  <Zap className="w-3 h-3 fill-current" /> LIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">Worker scan, pick, pack, dispatch operations as they happen</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 overflow-y-auto max-h-[520px] pr-1 no-scrollbar">
            {recentEvents.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                Awaiting live worker operation events…
              </div>
            ) : (
              recentEvents.slice(0, 40).map((evt, idx) => {
                const evtStyle = eventColors[evt.event_type || ''] || 'bg-slate-800/60 text-slate-400 border-slate-700';
                return (
                  <div
                    key={evt.id || idx}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 hover:bg-slate-950 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Event type pill */}
                      <span className={`shrink-0 px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-xl border ${evtStyle}`}>
                        {evt.event_type}
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs text-slate-200 font-medium truncate">
                          <span className="text-cyan-300 font-black">{evt.worker_name || 'System'}</span>
                          {' → '}
                          <span className="text-white font-black font-mono">{evt.item_sku || `#${evt.item_id}`}</span>
                          <span className="text-slate-400"> {evt.item_name ? `(${evt.item_name})` : ''}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {evt.zone_name || `Zone ${evt.zone_id}`}
                          {evt.quantity ? <span className="ml-1 text-slate-600">· Qty: {evt.quantity}</span> : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
