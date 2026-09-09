import {
  WarehouseZone,
  InventoryItem,
  Worker,
  Anomaly,
  EnvironmentReading,
  Order,
  RouteOptimizationResult,
  WarehouseEvent,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '');

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  async getZones(): Promise<WarehouseZone[]> {
    return fetchJson<WarehouseZone[]>('/zones');
  },

  async getItems(search?: string): Promise<InventoryItem[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchJson<InventoryItem[]>(`/items${query}`);
  },

  async getItemHistory(itemId: number): Promise<{ item: InventoryItem; events: WarehouseEvent[] }> {
    return fetchJson<{ item: InventoryItem; events: WarehouseEvent[] }>(`/items/${itemId}/history`);
  },

  async getWorkers(): Promise<Worker[]> {
    return fetchJson<Worker[]>('/workers');
  },

  async getAnomalies(page = 1, limit = 50): Promise<Anomaly[]> {
    return fetchJson<Anomaly[]>(`/anomalies?page=${page}&limit=${limit}`);
  },

  async getEnvironment(zoneId: number, limit = 20): Promise<EnvironmentReading[]> {
    return fetchJson<EnvironmentReading[]>(`/environment/${zoneId}?limit=${limit}`);
  },

  async getOrders(): Promise<Order[]> {
    return fetchJson<Order[]>('/orders');
  },

  async createOrder(itemIds: number[], assignedWorkerId?: number): Promise<Order> {
    return fetchJson<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify({ item_ids: itemIds, assigned_worker_id: assignedWorkerId }),
    });
  },

  async optimizeRoute(orderId: number): Promise<RouteOptimizationResult> {
    return fetchJson<RouteOptimizationResult>(`/orders/${orderId}/optimize-route`, {
      method: 'POST',
    });
  },

  async triggerDemoStep(): Promise<{ status: string }> {
    return fetchJson<{ status: string }>('/demo/trigger-step', {
      method: 'POST',
    });
  },

  async workerCheckin(workerId: number, zoneId: number): Promise<Worker> {
    return fetchJson<Worker>(`/workers/${workerId}/checkin?zone_id=${zoneId}`, {
      method: 'POST',
    });
  },

  async completeTask(taskId: number): Promise<{ status: string; task: any }> {
    return fetchJson<{ status: string; task: any }>(`/tasks/${taskId}/complete`, {
      method: 'POST',
    });
  },

  async reconcileItem(itemId: number, observedQuantity: number): Promise<{ status: string; item_id: number; reconciled_quantity: number }> {
    return fetchJson<{ status: string; item_id: number; reconciled_quantity: number }>(`/items/${itemId}/reconcile?observed_quantity=${observedQuantity}`, {
      method: 'POST',
    });
  },

  async getTasks(): Promise<any[]> {
    return fetchJson<any[]>('/tasks');
  },
};

