import React, { useEffect, useState } from 'react';
import { InventoryItem, WarehouseEvent, ZoneType } from '../types';
import { api } from '../services/api';
import { X, Package, Clock, User, MapPin, Activity, RefreshCw, Loader2, ArrowRight } from 'lucide-react';

interface ItemHistoryModalProps {
  item: InventoryItem | null;
  onClose: () => void;
}

const zoneTypeColors: Record<ZoneType, string> = {
  receiving: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  storage:   'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  picking:   'text-amber-400 border-amber-500/30 bg-amber-500/10',
  packing:   'text-purple-400 border-purple-500/30 bg-purple-500/10',
  dispatch:  'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
};

const eventTypeColors: Record<string, string> = {
  received:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  moved:      'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  picked:     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  packed:     'bg-purple-500/20 text-purple-300 border-purple-500/30',
  dispatched: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  scanned:    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

export const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({ item, onClose }) => {
  const [events, setEvents] = useState<WarehouseEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setLoading(true);
    setEvents([]);
    api.getItemHistory(item.id)
      .then((res) => setEvents(res.events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [item]);

  if (!item) return null;

  const flowStages = ['receiving', 'storage', 'picking', 'packing', 'dispatch'];
  const visitedTypes = Array.from(new Set(events.map(e => e.zone_type).filter(Boolean)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Glow edge top */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-md opacity-30 animate-pulse" />
              <div className="relative p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40">
                <Package className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-black text-white">{item.name}</h2>
                <span className="px-2.5 py-0.5 text-xs font-mono font-black bg-slate-950 text-cyan-400 border border-cyan-500/30 rounded-lg shadow">
                  {item.sku}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="text-slate-500">Cat:</span> {item.category}
                &nbsp;·&nbsp;
                <span className="text-slate-500">Zone:</span> <span className="text-slate-200">{item.zone_name || 'Unassigned'}</span>
                &nbsp;·&nbsp;
                <span className="text-slate-500">Status:</span> <span className="text-emerald-400 font-semibold capitalize">{item.status}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone Flow Map */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Journey Progress Map
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {flowStages.map((stage, idx) => {
              const visited = visitedTypes.includes(stage as ZoneType);
              const styles = zoneTypeColors[stage as ZoneType] || '';
              return (
                <React.Fragment key={stage}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold capitalize transition-all ${
                    visited ? styles : 'text-slate-600 border-slate-800 bg-slate-950/60'
                  }`}>
                    {visited && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                    {stage}
                  </div>
                  {idx < flowStages.length - 1 && (
                    <ArrowRight className={`w-3.5 h-3.5 ${visited ? 'text-cyan-500' : 'text-slate-700'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan-400" />
            Chronological Event Log &nbsp;
            <span className="text-cyan-400 font-mono font-black">{events.length} events</span>
          </h3>

          {loading ? (
            <div className="py-16 flex justify-center items-center gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span className="text-sm font-medium">Loading event history...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No movement history recorded yet for this item.
            </div>
          ) : (
            <div className="relative pl-7 space-y-4 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-cyan-500/80 before:via-indigo-500/50 before:to-transparent">
              {events.map((evt, idx) => {
                const evtStyle = eventTypeColors[evt.event_type || ''] || 'bg-slate-800/60 text-slate-300 border-slate-700';
                const zStyle = evt.zone_type ? zoneTypeColors[evt.zone_type] : '';
                return (
                  <div key={evt.id || idx} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -left-[25px] top-3 w-4 h-4 rounded-full border-2 border-slate-950 bg-gradient-to-tr from-cyan-500 to-indigo-500 shadow-lg shadow-cyan-500/30 group-hover:scale-125 transition-transform" />

                    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 hover:bg-slate-950 transition-all duration-200">
                      <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-lg border ${evtStyle}`}>
                            {evt.event_type}
                          </span>
                          {evt.zone_type && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border capitalize ${zStyle}`}>
                              {evt.zone_type}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Zone: <strong className="text-white">{evt.zone_name || `Zone ${evt.zone_id}`}</strong></span>
                        </div>
                        {evt.worker_name && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>Worker: <strong className="text-white">{evt.worker_name}</strong></span>
                          </div>
                        )}
                        {evt.quantity !== undefined && (
                          <div className="col-span-2 text-[11px] text-slate-400 font-mono bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                            Qty: <span className="text-white font-bold">{evt.quantity}</span>
                            {evt.expected_quantity ? <span className="text-slate-500"> / Expected: <span className="text-amber-300">{evt.expected_quantity}</span></span> : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
