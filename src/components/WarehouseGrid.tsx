import React from 'react';
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

export const WarehouseGrid: React.FC<WarehouseGridProps> = ({
  zones,
  workers,
  environment,
  anomalies,
  highlightPath,
  onSelectZone,
  selectedZoneId,
}) => {
  // Map grid coordinates (x: 0..2, y: 0..1)
  const gridMatrix: (WarehouseZone | null)[][] = [
    [null, null, null],
    [null, null, null],
  ];

  zones.forEach((z) => {
    if (z.grid_y >= 0 && z.grid_y < 2 && z.grid_x >= 0 && z.grid_x < 3) {
      gridMatrix[z.grid_y][z.grid_x] = z;
    }
  });

  // Calculate order path index per zone if route is highlighted
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
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Warehouse Grid Zones:</span>
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
        {/* Subtle Cyber Grid Matrix Background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(99,102,241,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.2) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Dynamic 2D Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
          {gridMatrix.map((row, y) =>
            row.map((zone, x) => {
              if (!zone) return null;
              const typeStyle = zoneTypeColors[zone.type] || zoneTypeColors.storage;
              const zoneWorkers = workers.filter((w) => w.current_zone_id === zone.id);
              const env = environment[zone.id];
              const zoneAnomalies = anomalies.filter(
                (a) => a.explanation.includes(zone.name) || (a.item_id && zone.item_count)
              );
              const hasAnomaly = zoneAnomalies.length > 0;
              const stepIndex = pathMap.get(zone.id);
              const isSelected = selectedZoneId === zone.id;
              const itemCount = zone.item_count || 0;
              const capacityPct = Math.min(100, Math.round((itemCount / 40) * 100));

              return (
                <div
                  key={zone.id}
                  onClick={() => onSelectZone?.(zone.id)}
                  className={`relative flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b ${typeStyle.bg} border transition-all duration-300 cursor-pointer group hover:-translate-y-1 ${
                    isSelected
                      ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-xl shadow-cyan-500/25'
                      : hasAnomaly
                      ? 'border-red-500/80 shadow-2xl shadow-red-500/30 animate-pulse-glow'
                      : `${typeStyle.border} ${typeStyle.glow}`
                  }`}
                >
                  {/* Step order badge for route visualizer */}
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
                          Coord ({zone.grid_x}, {zone.grid_y})
                        </span>
                      </div>
                    </div>

                    {hasAnomaly && (
                      <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg" title="Active Zone Anomaly">
                        <AlertTriangle className="w-5 h-5 text-red-400 animate-spin" />
                      </span>
                    )}
                  </div>

                  {/* Density Bar */}
                  <div className="my-2 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Density Capacity</span>
                      <span className="font-bold text-slate-200">{capacityPct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          capacityPct > 80 ? 'bg-amber-400' : typeStyle.accent
                        }`}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2.5 my-3">
                    {/* Item count */}
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-2.5">
                      <Package className={`w-4 h-4 ${typeStyle.text}`} />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Inventory</p>
                        <p className="text-sm font-black text-slate-100 font-mono">{itemCount} items</p>
                      </div>
                    </div>

                    {/* Workers count */}
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center space-x-2.5">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Active Staff</p>
                        <p className="text-sm font-black text-slate-100 font-mono">{zoneWorkers.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Environment readings */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <div className="flex items-center space-x-1.5 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-slate-200">{env ? `${env.temperature.toFixed(1)}°C` : '20.0°C'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold text-slate-200">{env ? `${env.humidity.toFixed(1)}%` : '45.0%'}</span>
                    </div>
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
            })
          )}
        </div>
      </div>
    </div>
  );
};
