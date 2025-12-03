/**
 * X-Ray Mode Store
 * Zustand store for managing real-time data flow visualization state
 */

import { create } from 'zustand';
import {
  XRayTraceEvent,
  XRayEdgeStats,
  XRayLayerStats,
  XRayConfig,
  XRayConnectionAnimation,
  XRayHotPath,
  DEFAULT_XRAY_CONFIG,
  getLayerFromPath,
  createEdgeId,
} from '@/app/features/Docs/sub_DocsAnalysis/lib/xrayTypes';

// Time window for calculating throughput (5 seconds)
const THROUGHPUT_WINDOW = 5000;
// Maximum events to keep in memory
const MAX_EVENTS = 500;
// Inactive edge timeout (10 seconds)
const INACTIVE_TIMEOUT = 10000;

interface XRayState {
  // Configuration
  config: XRayConfig;

  // Data
  events: XRayTraceEvent[];
  edges: Record<string, XRayEdgeStats>;
  layers: Record<string, XRayLayerStats>;
  hotPaths: XRayHotPath[];
  connectionAnimations: Record<string, XRayConnectionAnimation>;

  // Streaming state
  isConnected: boolean;
  lastUpdate: number | null;
  eventSource: EventSource | null;
}

interface XRayActions {
  // Configuration
  setConfig: (config: Partial<XRayConfig>) => void;
  toggleEnabled: () => void;

  // Data management
  addEvent: (event: XRayTraceEvent) => void;
  addEvents: (events: XRayTraceEvent[]) => void;
  clearEvents: () => void;
  updateStats: () => void;

  // Connection management
  connect: () => void;
  disconnect: () => void;

  // Animation helpers
  getEdgeAnimation: (edgeId: string) => XRayConnectionAnimation | null;
  getActiveEdges: () => string[];
  getHotPaths: () => XRayHotPath[];
}

export const useXRayStore = create<XRayState & XRayActions>((set, get) => ({
  // Initial state
  config: DEFAULT_XRAY_CONFIG,
  events: [],
  edges: {},
  layers: {
    pages: { layer: 'pages', totalRequests: 0, avgLatency: 0, errorRate: 0, activeConnections: 0, hotPaths: [] },
    client: { layer: 'client', totalRequests: 0, avgLatency: 0, errorRate: 0, activeConnections: 0, hotPaths: [] },
    server: { layer: 'server', totalRequests: 0, avgLatency: 0, errorRate: 0, activeConnections: 0, hotPaths: [] },
    external: { layer: 'external', totalRequests: 0, avgLatency: 0, errorRate: 0, activeConnections: 0, hotPaths: [] },
  },
  hotPaths: [],
  connectionAnimations: {},
  isConnected: false,
  lastUpdate: null,
  eventSource: null,

  // Configuration actions
  setConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  toggleEnabled: () => {
    const state = get();
    const newEnabled = !state.config.enabled;

    set({ config: { ...state.config, enabled: newEnabled } });

    if (newEnabled) {
      get().connect();
    } else {
      get().disconnect();
    }
  },

  // Data management
  addEvent: (event) => {
    set((state) => {
      const events = [event, ...state.events].slice(0, MAX_EVENTS);
      return { events, lastUpdate: Date.now() };
    });
    get().updateStats();
  },

  addEvents: (newEvents) => {
    set((state) => {
      const events = [...newEvents, ...state.events].slice(0, MAX_EVENTS);
      return { events, lastUpdate: Date.now() };
    });
    get().updateStats();
  },

  clearEvents: () =>
    set({
      events: [],
      edges: {},
      hotPaths: [],
      connectionAnimations: {},
      lastUpdate: null,
    }),

  updateStats: () => {
    const state = get();
    const now = Date.now();
    const windowStart = now - THROUGHPUT_WINDOW;

    // Group events by edge
    const edgeEvents: Record<string, XRayTraceEvent[]> = {};
    const layerStats: Record<string, { requests: number; latency: number[]; errors: number }> = {
      pages: { requests: 0, latency: [], errors: 0 },
      client: { requests: 0, latency: [], errors: 0 },
      server: { requests: 0, latency: [], errors: 0 },
      external: { requests: 0, latency: [], errors: 0 },
    };

    // Process recent events
    const recentEvents = state.events.filter((e) => e.timestamp > windowStart);

    recentEvents.forEach((event) => {
      const sourceLayer = event.sourceLayer || 'pages';
      const targetLayer = event.targetLayer;
      const edgeId = createEdgeId(sourceLayer, targetLayer);

      if (!edgeEvents[edgeId]) {
        edgeEvents[edgeId] = [];
      }
      edgeEvents[edgeId].push(event);

      // Aggregate layer stats
      if (layerStats[targetLayer]) {
        layerStats[targetLayer].requests++;
        layerStats[targetLayer].latency.push(event.duration);
        if (event.status >= 400) {
          layerStats[targetLayer].errors++;
        }
      }
    });

    // Calculate edge stats
    const edges: Record<string, XRayEdgeStats> = {};
    const connectionAnimations: Record<string, XRayConnectionAnimation> = {};

    Object.entries(edgeEvents).forEach(([edgeId, events]) => {
      const latencies = events.map((e) => e.duration);
      const errorCount = events.filter((e) => e.status >= 400).length;
      const throughput = events.length / (THROUGHPUT_WINDOW / 1000);

      edges[edgeId] = {
        edgeId,
        requestCount: events.length,
        avgLatency: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
        minLatency: latencies.length ? Math.min(...latencies) : 0,
        maxLatency: latencies.length ? Math.max(...latencies) : 0,
        errorCount,
        lastActivity: Math.max(...events.map((e) => e.timestamp)),
        throughput,
        recentEvents: events.slice(0, 10),
      };

      // Determine animation state
      const { highlightThreshold, latencyWarningThreshold } = state.config;
      let color: 'normal' | 'warning' | 'error' | 'hot' = 'normal';
      if (errorCount > 0) {
        color = 'error';
      } else if (edges[edgeId].avgLatency > latencyWarningThreshold) {
        color = 'warning';
      } else if (throughput > highlightThreshold) {
        color = 'hot';
      }

      connectionAnimations[edgeId] = {
        edgeId,
        pulseIntensity: Math.min(1, throughput / 10),
        isActive: events.length > 0,
        color,
        particleCount: Math.min(5, Math.ceil(throughput)),
      };
    });

    // Calculate layer aggregates
    const layers: Record<string, XRayLayerStats> = {};
    Object.entries(layerStats).forEach(([layer, stats]) => {
      const avgLatency = stats.latency.length
        ? stats.latency.reduce((a, b) => a + b, 0) / stats.latency.length
        : 0;

      // Find hot paths for this layer
      const layerEdges = Object.values(edges).filter(
        (e) => e.edgeId.endsWith(`->${layer}`)
      );
      const hotPaths = layerEdges
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 3)
        .map((e) => e.recentEvents[0]?.path || '')
        .filter(Boolean);

      layers[layer] = {
        layer: layer as 'pages' | 'client' | 'server' | 'external',
        totalRequests: stats.requests,
        avgLatency,
        errorRate: stats.requests > 0 ? stats.errors / stats.requests : 0,
        activeConnections: layerEdges.length,
        hotPaths,
      };
    });

    // Calculate global hot paths
    const pathCounts: Record<string, { count: number; latency: number[]; layers: Set<string> }> = {};
    recentEvents.forEach((event) => {
      if (!pathCounts[event.path]) {
        pathCounts[event.path] = { count: 0, latency: [], layers: new Set() };
      }
      pathCounts[event.path].count++;
      pathCounts[event.path].latency.push(event.duration);
      pathCounts[event.path].layers.add(event.targetLayer);
    });

    const hotPaths: XRayHotPath[] = Object.entries(pathCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([path, data]) => ({
        path,
        requestCount: data.count,
        avgLatency: data.latency.reduce((a, b) => a + b, 0) / data.latency.length,
        layers: Array.from(data.layers) as ('pages' | 'client' | 'server' | 'external')[],
      }));

    set({ edges, layers, hotPaths, connectionAnimations });
  },

  // Connection management
  connect: () => {
    const state = get();
    if (state.eventSource) {
      state.eventSource.close();
    }

    try {
      const eventSource = new EventSource('/api/xray/stream');

      eventSource.onopen = () => {
        set({ isConnected: true });
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'event') {
            get().addEvent(data.payload);
          } else if (data.type === 'batch') {
            get().addEvents(data.payload);
          }
        } catch {
          console.error('Failed to parse X-Ray event:', event.data);
        }
      };

      eventSource.onerror = () => {
        set({ isConnected: false });
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (get().config.enabled) {
            get().connect();
          }
        }, 5000);
      };

      set({ eventSource });
    } catch (error) {
      console.error('Failed to connect to X-Ray stream:', error);
      set({ isConnected: false });
    }
  },

  disconnect: () => {
    const state = get();
    if (state.eventSource) {
      state.eventSource.close();
    }
    set({ eventSource: null, isConnected: false });
  },

  // Animation helpers
  getEdgeAnimation: (edgeId) => {
    return get().connectionAnimations[edgeId] || null;
  },

  getActiveEdges: () => {
    const state = get();
    const now = Date.now();
    return Object.values(state.edges)
      .filter((edge) => now - edge.lastActivity < INACTIVE_TIMEOUT)
      .map((edge) => edge.edgeId);
  },

  getHotPaths: () => {
    return get().hotPaths;
  },
}));

// Selector hooks for optimized re-renders
export const useXRayEnabled = () => useXRayStore((state) => state.config.enabled);
export const useXRayEdges = () => useXRayStore((state) => state.edges);
export const useXRayLayers = () => useXRayStore((state) => state.layers);
export const useXRayAnimations = () => useXRayStore((state) => state.connectionAnimations);
export const useXRayHotPaths = () => useXRayStore((state) => state.hotPaths);
export const useXRayIsConnected = () => useXRayStore((state) => state.isConnected);
