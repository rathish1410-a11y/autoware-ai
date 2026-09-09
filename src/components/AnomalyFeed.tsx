import React, { useState } from 'react';
import { Anomaly, AnomalySeverity, AnomalyType } from '../types';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Clock,
  Package,
  ShieldAlert,
  Search,
  Filter,
  BrainCircuit,
  ExternalLink,
} from 'lucide-react';

interface AnomalyFeedProps {
  anomalies: Anomaly[];
  onSelectItem?: (sku: string) => void;
  onCompleteTask?: (taskId: number) => void;
}

const severityConfig: Record<AnomalySeverity, { bg: string; text: string; border: string; icon: any; ring: string }> = {
  critical: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
    icon: AlertOctagon,
    ring: 'ring-1 ring-red-500/50 shadow-lg shadow-red-500/20',
  },
  high: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/50',
    icon: AlertTriangle,
    ring: 'ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/20',
  },
  medium: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/50',
    icon: AlertTriangle,
    ring: 'border-yellow-500/30',
  },
  low: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
    icon: Info,
    ring: 'border-blue-500/30',
  },
};

const anomalyTypeLabels: Record<AnomalyType, string> = {
  misplaced: 'Misplaced Item',
  damaged: 'Damaged Goods (Vision AI)',
  duplicate_scan: 'Duplicate Scan Window',
  stuck: 'Dwell Timeout (Stuck Item)',
  quantity_mismatch: 'Quantity Discrepancy',
  unusual_movement: 'Unusual Flow Sequence',
  environment: 'Environmental Threshold Spike',
};

export const AnomalyFeed: React.FC<AnomalyFeedProps> = ({ anomalies, onSelectItem, onCompleteTask }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = anomalies.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.explanation.toLowerCase().includes(q) ||
        (a.item_sku && a.item_sku.toLowerCase().includes(q)) ||
        a.anomaly_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 shadow-2xl flex flex-col h-full backdrop-blur-xl">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-red-500/20 to-amber-500/20 border border-red-500/30 text-red-400">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
              Autonomous AI Anomaly Engine
              <span className="px-2 py-0.5 text-xs bg-slate-800 text-cyan-400 rounded-full font-mono font-bold">
                {anomalies.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Real-time reasoning & automated corrective tasks</p>
          </div>
        </div>

        {/* Filter inputs */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search anomalies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44 font-sans"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer text-xs font-medium"
            >
              <option value="all" className="bg-slate-900">All Severities</option>
              <option value="critical" className="bg-slate-900">Critical</option>
              <option value="high" className="bg-slate-900">High</option>
              <option value="medium" className="bg-slate-900">Medium</option>
              <option value="low" className="bg-slate-900">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feed List */}
      <div className="mt-4 space-y-3.5 overflow-y-auto max-h-[620px] pr-1 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No anomalies detected matching filter criteria.
          </div>
        ) : (
          filtered.map((anomaly) => {
            const config = severityConfig[anomaly.severity] || severityConfig.medium;
            const Icon = config.icon;
            const typeLabel = anomalyTypeLabels[anomaly.anomaly_type] || anomaly.anomaly_type;
            const expLoc = anomaly.expectedLocation || 'RACK-A3';
            const currLoc = anomaly.currentLocation || expLoc;
            const task = anomaly.task;
            const isResolved = anomaly.resolved || (task && task.status === 'COMPLETED');

            return (
              <div
                key={anomaly.id}
                className={`p-4.5 rounded-2xl border ${isResolved ? 'border-slate-800 bg-slate-950/40 opacity-75' : `${config.border} ${config.ring} bg-slate-950/80`} transition-all duration-200 group flex items-start space-x-3.5`}
              >
                <div className={`p-2.5 rounded-xl ${isResolved ? 'bg-slate-800 text-slate-400' : `${config.bg} ${config.text}`} shrink-0 mt-0.5`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-lg border ${isResolved ? 'bg-slate-800 text-slate-400 border-slate-700' : `${config.bg} ${config.text} ${config.border}`}`}>
                        {isResolved ? 'RESOLVED' : anomaly.severity}
                      </span>
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                        <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                        {typeLabel}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(anomaly.detected_at).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* AI Explanation Box */}
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 mt-2">
                    <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                      {anomaly.explanation}
                    </p>

                    {/* Expected vs Current Location */}
                    {anomaly.item_sku && (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-3 text-[11px] font-mono">
                        <span className="text-slate-400">Expected: <strong className="text-slate-200">{expLoc}</strong></span>
                        <span className="text-slate-600">➔</span>
                        <span className="text-slate-400">Current: <strong className={expLoc !== currLoc ? 'text-red-400 font-bold' : 'text-emerald-400'}>{currLoc}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Corrective Task Action Card */}
                  {task && !isResolved && (
                    <div className="mt-2.5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Automated Corrective Task</p>
                        <p className="text-xs font-medium text-slate-200 mt-0.5">{task.recommended_action}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">Assigned to: <strong className="text-cyan-300">{task.assigned_worker_name}</strong></p>
                      </div>
                      {onCompleteTask && (
                        <button
                          onClick={() => onCompleteTask(task.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono shadow-md transition-all shrink-0 cursor-pointer"
                        >
                          Complete Task
                        </button>
                      )}
                    </div>
                  )}

                  {/* SKU link pill */}
                  {anomaly.item_sku && (
                    <div className="mt-3 flex items-center space-x-2">
                      <button
                        onClick={() => onSelectItem?.(anomaly.item_sku!)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all cursor-pointer shadow-sm"
                      >
                        <Package className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Inspect SKU: {anomaly.item_sku}</span>
                        <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

