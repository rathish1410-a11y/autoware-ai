import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { api } from './services/api';
import { WarehouseZone, InventoryItem, Worker, Anomaly } from './types';
import { Header } from './components/Header';
import { WarehouseGrid } from './components/WarehouseGrid';
import { AnomalyFeed } from './components/AnomalyFeed';
import { InventoryTable } from './components/InventoryTable';
import { ItemHistoryModal } from './components/ItemHistoryModal';
import { RouteOptimizerPanel } from './components/RouteOptimizerPanel';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { WorkerActivityLog } from './components/WorkerActivityLog';
import { Activity, AlertTriangle, Boxes, Cpu, ShieldAlert, Zap, ArrowUpRight } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('grid');
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [isTriggeringDemo, setIsTriggeringDemo] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);

  const { isConnected, events: liveEvents, anomalies: liveAnomalies, latestEnv } = useWebSocket();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [zData, iData, wData, aData] = await Promise.all([
        api.getZones(), api.getItems(), api.getWorkers(), api.getAnomalies(1, 100),
      ]);
      setZones(zData);
      setItems(iData);
      setWorkers(wData);
      setAnomalies(aData);
    } catch (e) { console.error('Failed to load data:', e); }
  };

  // Merge live WS anomalies
  useEffect(() => {
    if (liveAnomalies.length > 0) {
      setAnomalies((prev) => {
        const ids = new Set(prev.map((a) => a.id));
        const fresh = liveAnomalies.filter((a) => !ids.has(a.id));
        return fresh.length > 0 ? [...fresh, ...prev] : prev;
      });
    }
  }, [liveAnomalies]);

  // Refresh zones + items on new events
  useEffect(() => {
    if (liveEvents.length > 0) {
      setTotalEvents(c => c + 1);
      api.getZones().then(setZones).catch(() => {});
      api.getItems().then(setItems).catch(() => {});
    }
  }, [liveEvents]);

  const handleTriggerDemo = async () => {
    setIsTriggeringDemo(true);
    try {
      await api.triggerDemoStep();
      await loadData();
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setIsTriggeringDemo(false), 800); }
  };

  const handleSelectSku = (sku: string) => {
    const found = items.find((i) => i.sku === sku);
    if (found) { setSelectedItem(found); return; }
    api.getItems(sku).then((res) => { if (res.length > 0) setSelectedItem(res[0]); });
  };

  const criticalCount = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  const inStockCount  = items.filter(i => i.status === 'in_stock').length;
  const dispatchCount = items.filter(i => i.status === 'dispatched').length;

  const metricCards = [
    { label: 'Warehouse Zones',   value: zones.length,  sub: '6-zone grid layout',         color: 'indigo', Icon: Boxes, delta: null },
    { label: 'Tracked SKUs',      value: items.length,  sub: `${inStockCount} in-stock`,    color: 'cyan',   Icon: Cpu,   delta: null },
    { label: 'AI Anomalies',      value: anomalies.length, sub: `${criticalCount} critical / high`, color: criticalCount ? 'red' : 'amber', Icon: ShieldAlert, delta: null },
    { label: 'Live Events Total', value: totalEvents,   sub: '1-3s update cadence',         color: 'emerald',Icon: Activity, delta: null },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Grid background texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Radial glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        anomalyCount={anomalies.length}
        criticalCount={criticalCount}
        onTriggerDemo={handleTriggerDemo}
        isTriggeringDemo={isTriggeringDemo}
      />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map(({ label, value, sub, color, Icon }) => (
            <div
              key={label}
              className={`relative bg-slate-900/80 p-5 rounded-2xl border border-${color}-500/20 shadow-lg overflow-hidden group hover:-translate-y-0.5 transition-transform`}
            >
              {/* Glowing top edge */}
              <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-${color}-500 to-transparent opacity-70`} />

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
                  <p className={`text-3xl font-black text-${color === 'red' ? 'red' : color}-400 font-mono leading-none`}>
                    {value}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1.5 font-mono">{sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
                  <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
              </div>

              <div className={`absolute bottom-0 right-0 w-16 h-16 bg-${color}-500/5 rounded-full blur-2xl`} />
            </div>
          ))}
        </div>

        {/* ── TABS ── */}

        {/* Grid Overview */}
        {activeTab === 'grid' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400 fill-current animate-pulse" />
                  Live 2D Spatial Warehouse Map
                </h2>
                <span className="text-xs text-slate-500 font-mono">Click zone for detail view</span>
              </div>
              <WarehouseGrid
                zones={zones}
                workers={workers}
                environment={latestEnv}
                anomalies={anomalies}
                onSelectZone={setSelectedZoneId}
                selectedZoneId={selectedZoneId}
              />
            </div>
            <div className="lg:col-span-1" style={{ minHeight: 540 }}>
              <AnomalyFeed anomalies={anomalies} onSelectItem={handleSelectSku} />
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <AnomalyFeed anomalies={anomalies} onSelectItem={handleSelectSku} />
        )}

        {activeTab === 'inventory' && (
          <InventoryTable items={items} onSelectItem={setSelectedItem} />
        )}

        {activeTab === 'route' && (
          <RouteOptimizerPanel zones={zones} items={items} />
        )}

        {activeTab === 'environment' && (
          <EnvironmentPanel zones={zones} environment={latestEnv} />
        )}

        {activeTab === 'workers' && (
          <WorkerActivityLog workers={workers} recentEvents={liveEvents} />
        )}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/60 mt-10 px-6 py-4 text-[11px] text-slate-600 font-mono flex flex-wrap justify-between gap-2 max-w-7xl mx-auto">
        <span>AutoWare AI © 2026 — AI-Powered Autonomous Warehouse Monitoring System (Hackathon MVP)</span>
        <span>Backend: Python FastAPI + Simulated RFID/IoT Event Layer &nbsp;·&nbsp; Frontend: React + TypeScript + Tailwind</span>
      </footer>

      {/* Item History Modal */}
      <ItemHistoryModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

export default App;
