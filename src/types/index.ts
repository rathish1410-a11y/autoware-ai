export type ZoneType = 'receiving' | 'storage' | 'picking' | 'packing' | 'dispatch';
export type ItemStatus = 'in_stock' | 'picked' | 'packed' | 'dispatched' | 'damaged' | 'missing';
export type AnomalyType = 'misplaced' | 'damaged' | 'duplicate_scan' | 'stuck' | 'quantity_mismatch' | 'unusual_movement' | 'environment';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type EventType = 'received' | 'moved' | 'picked' | 'packed' | 'dispatched' | 'scanned';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export interface Rack {
  id: string; // e.g. 'RACK-A1', 'RACK-D5'
  zone_id: number;
  zone_name: string;
  allowed_category: string;
  item_skus: string[];
}

export interface WarehouseZone {
  id: number;
  name: string;
  type: ZoneType;
  grid_x: number;
  grid_y: number;
  item_count?: number;
  temp?: number;
  humidity?: number;
  has_anomaly?: boolean;
  racks?: Rack[];
}

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  current_zone_id: number | null;
  zone_name?: string | null;
  zone_type?: ZoneType | null;
  expected_rack_id?: string;
  current_rack_id?: string;
  expectedLocation?: string;
  currentLocation?: string;
  status: ItemStatus;
  expected_quantity: number;
  scanned_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: number;
  name: string;
  current_zone_id: number | null;
  zone_name?: string | null;
  zone_type?: ZoneType | null;
  shift: 'day' | 'night';
  workload?: number;
}

export interface Task {
  id: number;
  anomaly_id?: number;
  item_id: number;
  item_sku: string;
  item_name?: string;
  recommended_action: string;
  assigned_worker_id: number;
  assigned_worker_name: string;
  expectedLocation: string;
  currentLocation: string;
  status: TaskStatus;
  created_at: string;
}

export interface WarehouseEvent {
  id: number | null;
  item_id: number;
  item_sku?: string;
  item_name?: string;
  worker_id?: number | null;
  worker_name?: string | null;
  zone_id: number;
  zone_name?: string;
  zone_type?: ZoneType;
  event_type: EventType;
  quantity?: number;
  expected_quantity?: number;
  timestamp: string;
}

export interface EnvironmentReading {
  id: number;
  zone_id: number;
  zone_name?: string;
  temperature: number;
  humidity: number;
  timestamp: string;
  alert?: boolean;
}

export interface Anomaly {
  id: number;
  item_id?: number | null;
  item_sku?: string | null;
  item_name?: string | null;
  event_id?: number | null;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  explanation: string;
  detected_at: string;
  task?: Task | null;
  resolved?: boolean;
}

export interface Order {
  id: number;
  item_ids: number[];
  status: 'pending' | 'assigned' | 'picking' | 'packing' | 'dispatched' | 'completed';
  assigned_worker_id?: number | null;
  expected_quantity?: number;
  scanned_quantity?: number;
  created_at?: string;
}

export interface RouteStop {
  zone_id: number;
  name: string;
  type: ZoneType;
  grid_x: number;
  grid_y: number;
}

export interface RouteOptimizationResult {
  order_id: number;
  optimized_path: RouteStop[];
  naive_path: RouteStop[];
  optimized_distance: number;
  naive_distance: number;
  distance_saved: number;
  distance_saved_pct: number;
  estimated_time_saved_s: number;
}

