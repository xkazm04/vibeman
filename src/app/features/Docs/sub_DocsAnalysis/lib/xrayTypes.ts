/**
 * X-Ray Mode Types
 * Type definitions for the real-time data flow visualization system
 */

// Represents a single API request/response flow
export interface XRayTraceEvent {
  id: string;
  timestamp: number;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  status: number;
  duration: number; // in milliseconds
  layer: 'pages' | 'client' | 'server' | 'external';
  sourceLayer?: 'pages' | 'client' | 'server' | 'external';
  targetLayer: 'pages' | 'client' | 'server' | 'external';
  contextGroupId?: string; // Optional mapping to a context group
  requestSize?: number; // bytes
  responseSize?: number; // bytes
  error?: string;
}

// Real-time traffic statistics for a connection/edge
export interface XRayEdgeStats {
  edgeId: string; // Format: "sourceLayer-targetLayer" or "sourceGroupId-targetGroupId"
  requestCount: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  errorCount: number;
  lastActivity: number; // timestamp
  throughput: number; // requests per second in last window
  recentEvents: XRayTraceEvent[]; // last N events for pulse animation
}

// Layer-level aggregated statistics
export interface XRayLayerStats {
  layer: 'pages' | 'client' | 'server' | 'external';
  totalRequests: number;
  avgLatency: number;
  errorRate: number;
  activeConnections: number;
  hotPaths: string[]; // Most active endpoints
}

// Complete X-Ray snapshot state
export interface XRaySnapshot {
  timestamp: number;
  edges: Record<string, XRayEdgeStats>;
  layers: Record<string, XRayLayerStats>;
  events: XRayTraceEvent[];
  hotPaths: XRayHotPath[];
}

// Hot path identification
export interface XRayHotPath {
  path: string;
  requestCount: number;
  avgLatency: number;
  layers: ('pages' | 'client' | 'server' | 'external')[];
}

// X-Ray mode configuration
export interface XRayConfig {
  enabled: boolean;
  refreshInterval: number; // ms
  maxEventsToShow: number;
  highlightThreshold: number; // requests/sec to trigger highlight
  latencyWarningThreshold: number; // ms
  autoHideInactiveEdges: boolean;
  showLabels: boolean;
}

// Default configuration
export const DEFAULT_XRAY_CONFIG: XRayConfig = {
  enabled: false,
  refreshInterval: 1000,
  maxEventsToShow: 100,
  highlightThreshold: 5,
  latencyWarningThreshold: 500,
  autoHideInactiveEdges: true,
  showLabels: true,
};

// Connection line animation state
export interface XRayConnectionAnimation {
  edgeId: string;
  pulseIntensity: number; // 0-1
  isActive: boolean;
  color: 'normal' | 'warning' | 'error' | 'hot';
  particleCount: number;
}

// API route category mapping
export const API_ROUTE_LAYER_MAP: Record<string, 'pages' | 'client' | 'server' | 'external'> = {
  // Client-side routes (UI interactions)
  '/api/contexts': 'client',
  '/api/ideas': 'client',
  '/api/goals': 'client',
  '/api/projects': 'client',

  // Server-side routes (backend processing)
  '/api/llm': 'server',
  '/api/scan-queue': 'server',
  '/api/claude-code': 'server',
  '/api/structure-scan': 'server',
  '/api/build-fixer': 'server',

  // External service routes
  '/api/voicebot': 'external',
  '/api/tester': 'external',
  '/api/dependencies': 'external',
  '/api/security': 'external',

  // Page routes (Next.js pages)
  '/api/onboarding': 'pages',
  '/api/disk': 'server',
};

// Helper to determine layer from path
export function getLayerFromPath(path: string): 'pages' | 'client' | 'server' | 'external' {
  for (const [prefix, layer] of Object.entries(API_ROUTE_LAYER_MAP)) {
    if (path.startsWith(prefix)) {
      return layer;
    }
  }
  // Default to server for unknown API routes
  if (path.startsWith('/api/')) {
    return 'server';
  }
  // Page routes
  return 'pages';
}

// Helper to create edge ID
export function createEdgeId(source: string, target: string): string {
  return `${source}->${target}`;
}

// Helper to parse edge ID
export function parseEdgeId(edgeId: string): { source: string; target: string } | null {
  const parts = edgeId.split('->');
  if (parts.length !== 2) return null;
  return { source: parts[0], target: parts[1] };
}
