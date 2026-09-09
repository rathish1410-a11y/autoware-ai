import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  Compass,
  Cpu,
  Layers,
  Play,
  Radio,
  ShieldAlert,
  Sparkles,
  Thermometer,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
  anomalyCount: number;
  criticalCount: number;
  onTriggerDemo: () => void;
  isTriggeringDemo: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  anomalyCount,
  criticalCount,
  onTriggerDemo,
  isTriggeringDemo,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const update = () => setTimeStr(new Date().toLocaleTimeString());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'grid', label: 'Warehouse Grid', icon: Layers },
    { id: 'anomalies', label: 'AI Anomaly Engine', icon: ShieldAlert, badge: anomalyCount },
    { id: 'inventory', label: 'Live Inventory', icon: Boxes },
    { id: 'route', label: 'Route Optimizer', icon: Compass },
    { id: 'environment', label: 'Telemetry Sensors', icon: Thermometer },
    { id: 'workers', label: 'Worker Roster', icon: Users },
  ];

  return (
    <header className="bg-slate-950/95 border-b border-indigo-500/20 backdrop-blur-xl sticky top-0 z-40 shadow-2xl">
      {/* Top Cyber Ticker Bar */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-950 to-blue-950 px-4 py-1 border-b border-slate-800/80 text-[11px] flex items-center justify-between font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1 text-indigo-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>AUTON-STREAM v2.4</span>
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400">
            ENGINE: <span className="text-emerald-400">ONLINE</span> (FastAPI + Async Event Simulator)
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-cyan-400 font-bold">{timeStr || '00:00:00'}</span>
          <span className="hidden md:inline text-slate-500">SYSTEM HEALTH: 99.98%</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-blue-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300 animate-tilt" />
              <div className="relative w-10 h-10 rounded-xl bg-slate-950 p-0.5 flex items-center justify-center border border-indigo-500/30">
                <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                  AutoWare AI
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> COMMAND CENTER
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Autonomous Warehouse Event Reasoning & Monitoring</p>
            </div>
          </div>

          {/* Controls & Status */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Live WS Status */}
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shadow-inner">
              {isConnected ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 font-bold tracking-wide flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" /> LIVE WEBSOCKET
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <WifiOff className="w-3.5 h-3.5" /> RECONNECTING...
                  </span>
                </>
              )}
            </div>

            {/* Critical Anomaly Alert Pill */}
            {criticalCount > 0 && (
              <div className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse shadow-lg shadow-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>{criticalCount} CRITICAL ALERT{criticalCount > 1 ? 'S' : ''}</span>
              </div>
            )}

            {/* Stage Demo Action Button */}
            <button
              onClick={onTriggerDemo}
              disabled={isTriggeringDemo}
              className="relative group overflow-hidden rounded-xl px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-600/30 transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Simulate controlled anomaly sequence for live stage pitch"
            >
              <div className="flex items-center space-x-2">
                <Play className="w-3.5 h-3.5 fill-current text-white animate-pulse" />
                <span>Trigger Pitch Demo</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-600/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400 animate-bounce' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full font-mono ${
                      isActive ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
