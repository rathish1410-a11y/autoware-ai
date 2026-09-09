import { useEffect, useState, useRef, useCallback } from 'react';
import { WarehouseEvent, Anomaly, EnvironmentReading } from '../types';

const WS_BASE_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws/live');

interface WebSocketState {
  isConnected: boolean;
  events: WarehouseEvent[];
  anomalies: Anomaly[];
  latestEnv: Record<number, EnvironmentReading>;
  lastMessageTime: string | null;
}

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    events: [],
    anomalies: [],
    latestEnv: {},
    lastMessageTime: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_BASE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((prev) => ({ ...prev, isConnected: true }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const nowStr = new Date().toLocaleTimeString();

          if (payload.type === 'event') {
            const newEvt: WarehouseEvent = payload.data;
            setState((prev) => ({
              ...prev,
              events: [newEvt, ...prev.events.slice(0, 99)],
              lastMessageTime: nowStr,
            }));
          } else if (payload.type === 'anomaly_detected') {
            const newAnomaly: Anomaly = payload.data;
            setState((prev) => ({
              ...prev,
              anomalies: [newAnomaly, ...prev.anomalies.slice(0, 99)],
              lastMessageTime: nowStr,
            }));
          } else if (payload.type === 'environment') {
            const newEnv: EnvironmentReading = payload.data;
            setState((prev) => ({
              ...prev,
              latestEnv: {
                ...prev.latestEnv,
                [newEnv.zone_id]: newEnv,
              },
              lastMessageTime: nowStr,
            }));
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setState((prev) => ({ ...prev, isConnected: false }));
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('Failed to initiate WebSocket connection:', e);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return state;
}
