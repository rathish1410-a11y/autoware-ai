import React, { useState } from 'react';
import { InventoryItem, ItemStatus } from '../types';
import { Search, Filter, Package, History, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  onSelectItem: (item: InventoryItem) => void;
}

const statusConfig: Record<ItemStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  in_stock:   { label: 'In Stock',   bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  picked:     { label: 'Picked',     bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
  packed:     { label: 'Packed',     bg: 'bg-purple-500/20',  text: 'text-purple-300',  border: 'border-purple-500/30',  dot: 'bg-purple-400' },
  dispatched: { label: 'Dispatched', bg: 'bg-blue-500/20',    text: 'text-blue-300',    border: 'border-blue-500/30',    dot: 'bg-blue-400' },
  damaged:    { label: 'Damaged',    bg: 'bg-red-500/20',     text: 'text-red-300',     border: 'border-red-500/30',     dot: 'bg-red-400' },
  missing:    { label: 'Missing',    bg: 'bg-pink-500/20',    text: 'text-pink-300',    border: 'border-pink-500/30',    dot: 'bg-pink-400' },
};

export const InventoryTable: React.FC<InventoryTableProps> = ({ items, onSelectItem }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<string>('sku');
  const [sortAsc, setSortAsc] = useState(true);

  const categories = Array.from(new Set(items.map((i) => i.category))).filter(Boolean);

  const handleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const filteredItems = items
    .filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.sku.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.zone_name && item.zone_name.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      const va = String((a as any)[sortField] || '');
      const vb = String((b as any)[sortField] || '');
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 inline-flex flex-col opacity-50">
      {sortField === field
        ? sortAsc
          ? <ChevronUp className="w-3 h-3 text-cyan-400 opacity-100" />
          : <ChevronDown className="w-3 h-3 text-cyan-400 opacity-100" />
        : <ChevronDown className="w-3 h-3" />}
    </span>
  );

  return (
    <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-xl blur opacity-30 animate-pulse" />
              <div className="relative p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                Live Inventory Command
                <span className="px-2 py-0.5 text-xs bg-slate-800 text-cyan-400 rounded-full font-mono font-bold border border-cyan-500/20">
                  {items.length} SKUs
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Click any row for full chronological movement timeline
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search SKU / name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 w-44 transition-all"
              />
            </div>

            <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-slate-300 focus:outline-none cursor-pointer text-xs"
              >
                <option value="all" className="bg-slate-900">All Categories</option>
                {categories.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              {(Object.keys(statusConfig) as ItemStatus[]).map((s) => (
                <option key={s} value={s} className="bg-slate-900">{statusConfig[s].label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[10px] tracking-widest font-bold uppercase bg-slate-950/60">
              {[
                { field: 'sku',      label: 'SKU' },
                { field: 'name',     label: 'Product' },
                { field: 'category', label: 'Category' },
                { field: 'zone_name',label: 'Zone' },
                { field: 'status',   label: 'Status' },
              ].map(({ field, label }) => (
                <th
                  key={field}
                  className="py-3.5 px-4 cursor-pointer hover:text-cyan-400 transition-colors select-none"
                  onClick={() => handleSort(field)}
                >
                  <span className="flex items-center">{label}<SortIcon field={field} /></span>
                </th>
              ))}
              <th className="py-3.5 px-4 text-right">Qty (Scanned/Exp)</th>
              <th className="py-3.5 px-4 text-center">Timeline</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                  No items match the current search / filter criteria.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => {
                const s = statusConfig[item.status] || statusConfig.in_stock;
                const isQtyMismatch = item.scanned_quantity > 0 && item.scanned_quantity !== item.expected_quantity;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-all duration-200 cursor-pointer group"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* SKU */}
                    <td className="py-3.5 px-4">
                      <span className="font-black font-mono text-indigo-400 group-hover:text-cyan-400 transition-colors text-xs">
                        {item.sku}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      {item.name}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 text-[10px] bg-slate-800/80 text-slate-300 rounded-md border border-slate-700">
                        {item.category}
                      </span>
                    </td>

                    {/* Zone */}
                    <td className="py-3.5 px-4">
                      {item.zone_name ? (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-slate-200 border border-slate-700 font-semibold text-[11px]">
                          📍 {item.zone_name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold rounded-lg border ${s.bg} ${s.text} ${s.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
                        {s.label}
                      </span>
                    </td>

                    {/* Qty */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs">
                      {isQtyMismatch ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                          ⚠ {item.scanned_quantity} / {item.expected_quantity}
                        </span>
                      ) : (
                        <span className="text-slate-300">
                          {item.scanned_quantity} / {item.expected_quantity}
                        </span>
                      )}
                    </td>

                    {/* History button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectItem(item); }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/60 transition-all text-[11px] font-bold"
                        title="View movement timeline"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Timeline</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center gap-4 text-[11px] font-mono">
        <span className="text-slate-400">Showing <span className="text-cyan-400 font-bold">{filteredItems.length}</span> of <span className="text-white font-bold">{items.length}</span> items</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          In Stock: <span className="text-emerald-400 font-bold">{items.filter(i => i.status === 'in_stock').length}</span>
        </span>
        <span className="text-slate-400">
          Dispatched: <span className="text-blue-400 font-bold">{items.filter(i => i.status === 'dispatched').length}</span>
        </span>
        <span className="text-slate-400">
          Alerts: <span className="text-amber-400 font-bold">{items.filter(i => i.status === 'damaged' || i.status === 'missing').length}</span>
        </span>
      </div>
    </div>
  );
};
