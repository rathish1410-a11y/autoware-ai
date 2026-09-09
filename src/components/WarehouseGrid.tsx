import React, { useState } from 'react';
import {
  WarehouseZone,
  Worker,
  EnvironmentReading,
  Anomaly,
  RouteStop,
  ZoneType,
} from '../types';
import {
  Package,
  Users,
  Thermometer,
  Droplets,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Compass,
} from 'lucide-react';

interface WarehouseGridProps {
  zones: WarehouseZone[];
  workers: Worker[];
  environment: Record<number, EnvironmentReading>;
  anomalies: Anomaly[];
  highlightPath?: RouteStop[];
  onSelectZone?: (zoneId: number) => void;
  selectedZoneId?: number | null;
}

const zoneTypeColors: Record<ZoneType, { bg: string; border: string; text: string; badge: string; glow: string; accent: string }> = {
  receiving: {
    bg: 'from-blue-950/80 via-slate-900 to-blue-950/40',
    border: 'border-blue-500/40 hover:border-blue-400',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    glow: 'shadow-blue-500/10',
    accent: 'bg-blue-500',
  },
  storage: {
    bg: 'from-indigo-950/80 via-slate-900 to-indigo-950/40',
    border: 'border-indigo-500/40 hover:border-indigo-400',
    text: 'text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    glow: 'shadow-indigo-500/10',
    accent: 'bg-indigo-500',
  },
  picking: {
    bg: 'from-amber-950/80 via-slate-900 to-amber-950/40',
    border: 'border-amber-500/40 hover:border-amber-400',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    glow: 'shadow-amber-500/10',
    accent: 'bg-amber-500',
  },
  packing: {
    bg: 'from-purple-950/80 via-slate-900 to-purple-950/40',
    border: 'border-purple-500/40 hover:border-purple-400',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    glow: 'shadow-purple-500/10',
    accent: 'bg-purple-500',
  },
  dispatch: {
    bg: 'from-emerald-950/80 via-slate-900 to-emerald-950/40',
    border: 'border-emerald-500/40 hover:border-emerald-400',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    glow: 'shadow-emerald-500/10',
    accent: 'bg-emerald-500',
  },
};

const ZONE_RACK_MAP: Record<string, string[]> = {
  "Receiving A": ["RACK-REC-1"],
  "Storage B": ["RACK-A1", "RACK-A2", "RACK-A3"],
  "Storage C": ["RACK-B1", "RACK-B2"],
  "Picking D": ["RACK-C1"],
  "Packing E": ["RACK-C2"],
  "Dispatch F": ["RACK-D5"],
};

export const WarehouseGrid: React.FC<WarehouseGridProps> = ({
  zones,
  workers,
  environment,
  anomalies,
  highlightPath,
  onSelectZone,
  selectedZoneId,
}) => {
  const [scanningRack, setScanningRack] = useState<string | null>(null);

  const pathMap = new Map<number, number>();
  if (highlightPath) {
    highlightPath.forEach((stop, idx) => {
      pathMap.set(stop.zone_id, idx + 1);
    });
  }

  return (
    <div className="space-y-4">
      {/* Legend & Active Path Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Warehouse Top-Down Map & Racks:</span>
          {(['receiving', 'storage', 'picking', 'packing', 'dispatch'] as ZoneType[]).map((t) => (
            <div key={t} className="flex items-center space-x-1.5 capitalize">
              <span className={`w-2.5 h-2.5 rounded-full ${zoneTypeColors[t].accent}`} />
              <span className="text-slate-300 font-medium">{t}</span>
            </div>
          ))}
        </div>

        {highlightPath && highlightPath.length > 0 && (
          <div className="flex items-center space-x-2 text-cyan-300 font-bold bg-cyan-950/60 px-3.5 py-1.5 rounded-xl border border-cyan-500/40 shadow-lg shadow-cyan-500/20">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>AI TSP Picking Route Overlay Active ({highlightPath.length} stops)</span>
          </div>
        )}
      </div>

      {/* Grid Container */}
      <div className="relative bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(99,102,241,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.2) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Dynamic 2D Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
          {zones.map((zone) => {
            const typeStyle = zoneTypeColors[zone.type] || zoneTypeColors.storage;
            const zoneWorkers = workers.filter((w) => w.current_zone_id === zone.id);
            const env = environment[zone.id];
            const zoneAnomalies = anomalies.filter(
              (a) => a.explanation.includes(zone.name) || (a.item_id && zone.item_count)
            );
            const hasAnomaly = zoneAnomalies.length > 0;
            const stepIndex = pathMap.get(zone.id);
            const isSelected = selectedZoneId === zone.id;
            const racks = ZONE_RACK_MAP[zone.name] || ["RACK-01"];

            return (
              <div
                key={zone.id}
                onClick={() => onSelectZone?.(zone.id)}
                className={`relative flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b ${typeStyle.bg} border transition-all duration-300 cursor-pointer group hover:-translate-y-1 ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-xl shadow-cyan-500/25'
                    : hasAnomaly
                    ? 'border-red-500/80 shadow-2xl shadow-red-500/30 animate-pulse'
                    : `${typeStyle.border} ${typeStyle.glow}`
                }`}
              >
                {stepIndex !== undefined && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xl border-2 border-slate-950 animate-bounce">
                    #{stepIndex}
                  </div>
                )}

                {/* Header info */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-base text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {zone.name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase border ${typeStyle.badge}`}>
                        {zone.type}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({zone.grid_x}, {zone.grid_y})
                      </span>
                    </div>
                  </div>

                  {hasAnomaly && (
                    <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg" title="Active Zone Anomaly">
                      <AlertTriangle className="w-5 h-5 text-red-400 animate-spin" />
                    </span>
                  )}
                </div>

                {/* Top-Down Rack Display */}
                <div className="my-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Racks & Shelves</span>
                    <span className="text-cyan-400">{racks.length} Active Racks</span>
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    {racks.map((rackId) => {
                      const isMisplacedRack = hasAnomaly && (rackId === 'RACK-D5' || rackId === 'RACK-A3');
                      return (
                        <div
                          key={rackId}
                          onClick={(e) => {
                            e.stopPropagation();
                            setScanningRack(rackId);
                          }}
                          className={`p-2 rounded-lg border font-mono text-xs flex items-center justify-between transition-all ${
                            isMisplacedRack
                              ? 'bg-red-500/20 border-red-500/60 text-red-300 animate-pulse'
                              : 'bg-slate-900 border-slate-800 hover:border-indigo-500 text-slate-200'
                          }`}
                        >
                          <span className="font-bold flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-indigo-400" />
                            {rackId}
                          </span>
                          <button className="px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded text-[9px] font-bold border border-indigo-500/30">
                            📷 Scan Rack
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{zoneWorkers.length} workers</span>
                  </div>

                  {env && (
                    <div className="flex items-center space-x-2">
                      <span className={env.temperature > 25 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                        {env.temperature}°C
                      </span>
                      <span>•</span>
                      <span className="text-slate-300">{env.humidity}%</span>
                    </div>
                  )}
                </div>

                {/* Active worker tags */}
                {zoneWorkers.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex flex-wrap gap-1">
                    {zoneWorkers.map((w) => (
                      <span key={w.id} className="px-2 py-0.5 text-[10px] bg-slate-900/90 text-cyan-300 rounded-md border border-cyan-500/20 font-medium flex items-center gap-1">
                        👤 {w.name.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Vision Rack Scanner Modal */}
      {scanningRack && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                  📷 Simulated Vision Rack Scanner
                  <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded-full font-mono font-bold border border-indigo-500/30">
                    {scanningRack}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Vision Detection Confidence: <strong className="text-emerald-400 font-bold">98.4%</strong>
                </p>
              </div>
              <button
                onClick={() => setScanningRack(null)}
                className="text-slate-500 hover:text-slate-300 text-xs font-mono"
              >
                ✕ Close HUD
              </button>
            </div>

            {/* Camera Viewport Simulation */}
            <div className="relative h-64 bg-slate-950 rounded-2xl border-2 border-dashed border-cyan-500/40 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/30 via-transparent to-indigo-950/20 pointer-events-none" />

              {/* Bounding Box Overlays */}
              <div className="absolute top-8 left-12 w-32 h-20 border-2 border-emerald-400 bg-emerald-500/10 rounded-lg p-2 flex flex-col justify-between">
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-slate-950/90 px-1 py-0.5 rounded w-max">
                  SKU-4801 (MATCH) 98.4%
                </span>
              </div>

              {scanningRack === 'RACK-D5' || scanningRack === 'RACK-A3' ? (
                <div className="absolute bottom-8 right-12 w-36 h-24 border-2 border-red-500 bg-red-500/20 rounded-lg p-2 flex flex-col justify-between animate-pulse">
                  <span className="text-[9px] font-mono font-bold text-red-300 bg-slate-950/90 px-1 py-0.5 rounded w-max">
                    P-305 (MISPLACED) 97.1%
                  </span>
                  <span className="text-[8px] text-red-200 font-mono">Expected: RACK-A3</span>
                </div>
              ) : (
                <div className="absolute bottom-8 right-12 w-32 h-20 border-2 border-emerald-400 bg-emerald-500/10 rounded-lg p-2 flex flex-col justify-between">
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-slate-950/90 px-1 py-0.5 rounded w-max">
                    SKU-4802 (MATCH) 99.2%
                  </span>
                </div>
              )}

              <div className="text-center font-mono space-y-1">
                <p className="text-xs text-slate-400 font-bold">Scanning Active Camera Stream...</p>
                <p className="text-[10px] text-slate-600">HUD Analysis Engine Operational</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setScanningRack(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono shadow-lg shadow-indigo-600/30"
              >
                Close Scanner HUD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
