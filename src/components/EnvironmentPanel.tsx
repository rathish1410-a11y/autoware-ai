import React from 'react';
import { WarehouseZone, EnvironmentReading } from '../types';
import { Thermometer, Droplets, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface EnvironmentPanelProps {
  zones: WarehouseZone[];
  environment: Record<number, EnvironmentReading>;
}

const TEMP_MIN = 15, TEMP_MAX = 25;
const HUM_MIN = 30, HUM_MAX = 60;

function gauge(val: number, min: number, max: number, safeMin: number, safeMax: number) {
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  const inRange = val >= safeMin && val <= safeMax;
  return { pct, inRange };
}

export const EnvironmentPanel: React.FC<EnvironmentPanelProps> = ({ zones, environment }) => {
  return (
    <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-cyan-400" />

      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500 rounded-2xl blur-md opacity-30 animate-pulse" />
              <div className="relative p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40">
                <Thermometer className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">IoT Environmental Sensor Telemetry</h2>
              <p className="text-xs text-slate-400">Per-zone temperature & humidity safety monitoring (simulated feed)</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500">Safe Temp Range: </span>
              <strong className="text-amber-400 font-mono">15°C – 25°C</strong>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div>
              <span className="text-slate-500">Safe Humidity: </span>
              <strong className="text-cyan-400 font-mono">30% – 60%</strong>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => {
            const env = environment[zone.id] || { temperature: 20.0, humidity: 45.0, timestamp: new Date().toISOString() };
            const isTempAlert = env.temperature < TEMP_MIN || env.temperature > TEMP_MAX;
            const isHumAlert = env.humidity < HUM_MIN || env.humidity > HUM_MAX;
            const hasAlert = isTempAlert || isHumAlert;

            const tempG = gauge(env.temperature, 5, 40, TEMP_MIN, TEMP_MAX);
            const humG  = gauge(env.humidity, 10, 90, HUM_MIN, HUM_MAX);

            return (
              <div
                key={zone.id}
                className={`p-5 rounded-2xl border transition-all duration-300 ${
                  hasAlert
                    ? 'bg-gradient-to-b from-red-950/40 to-slate-950/80 border-red-500/60 shadow-xl shadow-red-500/20 animate-pulse-glow'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Zone name */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-sm">{zone.name}</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">{zone.type}</p>
                  </div>
                  {hasAlert ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" /> ALERT
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5" /> NOMINAL
                    </span>
                  )}
                </div>

                {/* Temperature Gauge */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />Temperature
                    </span>
                    <span className={`font-black font-mono text-base ${isTempAlert ? 'text-red-400' : 'text-slate-100'}`}>
                      {env.temperature.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isTempAlert ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse' : 'bg-gradient-to-r from-amber-400 to-amber-300'
                      }`}
                      style={{ width: `${tempG.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                    <span>5°C</span><span className="text-slate-500">Safe: 15–25°C</span><span>40°C</span>
                  </div>
                </div>

                {/* Humidity Gauge */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" />Humidity
                    </span>
                    <span className={`font-black font-mono text-base ${isHumAlert ? 'text-red-400' : 'text-slate-100'}`}>
                      {env.humidity.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isHumAlert ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-cyan-300'
                      }`}
                      style={{ width: `${humG.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                    <span>10%</span><span className="text-slate-500">Safe: 30–60%</span><span>90%</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 font-mono mt-3 text-right">
                  ⟳ {new Date(env.timestamp).toLocaleTimeString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
