import React, { useState, useEffect } from 'react';
import { Order, RouteOptimizationResult, InventoryItem, WarehouseZone } from '../types';
import { api } from '../services/api';
import { WarehouseGrid } from './WarehouseGrid';
import { Compass, Play, CheckCircle2, Zap, ArrowRight, Clock, MapPin, Plus, Loader2, TrendingDown } from 'lucide-react';

interface RouteOptimizerPanelProps {
  zones: WarehouseZone[];
  items: InventoryItem[];
}

export const RouteOptimizerPanel: React.FC<RouteOptimizerPanelProps> = ({ zones, items }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [routeResult, setRouteResult] = useState<RouteOptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
      if (data.length > 0 && !selectedOrderId) setSelectedOrderId(data[0].id);
    } catch (e) { console.error(e); }
  };

  const handleOptimize = async (orderId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.optimizeRoute(orderId);
      setRouteResult(res);
    } catch (err: any) {
      setError(err.message || 'Route optimization failed');
      setRouteResult(null);
    } finally { setLoading(false); }
  };

  const handleCreateAndOptimize = async () => {
    if (!selectedItemIds.length) return;
    setCreatingOrder(true);
    try {
      const newOrder = await api.createOrder(selectedItemIds);
      await fetchOrders();
      setSelectedOrderId(newOrder.id);
      await handleOptimize(newOrder.id);
      setSelectedItemIds([]);
    } catch (err: any) { setError(err.message); }
    finally { setCreatingOrder(false); }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        <div className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3.5">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 rounded-2xl blur-md opacity-30 animate-pulse" />
                <div className="relative p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/40">
                  <Compass className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">TSP Nearest-Neighbour Route Optimizer</h2>
                <p className="text-xs text-slate-400">Grid graph heuristic — compares naive vs optimized picker path efficiency</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {orders.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Order:</span>
                  <select
                    value={selectedOrderId || ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedOrderId(id);
                      handleOptimize(id);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id} className="bg-slate-900">
                        Order #{o.id} ({o.item_ids.length} items)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedOrderId && (
                <button
                  onClick={() => handleOptimize(selectedOrderId)}
                  disabled={loading}
                  className="relative group flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  {loading ? 'Optimizing...' : 'Calculate Optimal Path'}
                </button>
              )}
            </div>
          </div>

          {/* Quick order creator */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-300">Quick Test Order:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {items.slice(0, 6).map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemIds(prev =>
                      isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                    )}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isSelected && '✓ '}{item.sku}
                    <span className="ml-1 text-slate-500 font-normal">({item.zone_name || '?'})</span>
                  </button>
                );
              })}
              <button
                onClick={handleCreateAndOptimize}
                disabled={!selectedItemIds.length || creatingOrder}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                {creatingOrder ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {creatingOrder ? 'Creating...' : `Create & Optimize (${selectedItemIds.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 font-medium">
          ⚠ {error}
        </div>
      )}

      {/* Metrics Cards */}
      {routeResult && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Naive Distance', value: `${routeResult.naive_distance} units`, sub: 'item-list order', color: 'slate', icon: null },
            { label: 'Optimized Distance', value: `${routeResult.optimized_distance} units`, sub: 'AI nearest-neighbour TSP', color: 'cyan', icon: Zap, glow: true },
            { label: 'Distance Saved', value: `${routeResult.distance_saved_pct}%`, sub: `${routeResult.distance_saved} grid units`, color: 'emerald', icon: TrendingDown },
            { label: 'Time Saved (est.)', value: `${routeResult.estimated_time_saved_s}s`, sub: 'per order at 2s/unit', color: 'indigo', icon: Clock },
          ].map(({ label, value, sub, color, icon: Icon, glow }) => (
            <div key={label} className={`relative bg-slate-900/80 p-5 rounded-2xl border border-${color}-500/30 ${glow ? `shadow-lg shadow-${color}-500/20` : ''} overflow-hidden`}>
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-${color}-500 to-transparent opacity-70`} />
              <p className={`text-xs font-bold text-${color}-400 flex items-center gap-1.5 mb-2`}>
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
              </p>
              <p className={`text-2xl font-black text-${color === 'slate' ? 'slate-200' : color + '-300'} font-mono`}>
                {value}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grid Overlay */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          Spatial Warehouse Grid — Route Overlay
        </h3>
        <WarehouseGrid
          zones={zones}
          workers={[]}
          environment={{}}
          anomalies={[]}
          highlightPath={routeResult?.optimized_path}
        />
      </div>

      {/* Step-by-step breakdown */}
      {routeResult && (
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Optimized Picking Sequence — Step-by-Step
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {routeResult.optimized_path.map((stop, idx) => (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-2.5 bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 hover:border-cyan-500/30 transition-all">
                  <span className="w-6 h-6 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-100 text-xs">{stop.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">{stop.type} ({stop.grid_x},{stop.grid_y})</p>
                  </div>
                </div>
                {idx < routeResult.optimized_path.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-cyan-500/60 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
