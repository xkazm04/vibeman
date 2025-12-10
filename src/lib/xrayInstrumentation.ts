/**
 * X-Ray Instrumentation
 * Utilities for instrumenting API routes to capture traffic data
 */

import { getLayerFromPath } from '@/app/features/Docs/sub_DocsAnalysis/lib/xrayTypes';
import { generateXrayId } from '@/lib/idGenerator';

// Event interface matching the stream route
interface XRayEvent {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  duration: number;
  layer: string;
  sourceLayer?: string;
  targetLayer: string;
  requestSize?: number;
  responseSize?: number;
  error?: string;
}

// Generate unique ID using shared idGenerator
const generateId = generateXrayId;

// Global buffer for events (accessible from middleware and stream)
let xrayEventBuffer: XRayEvent[] = [];
const xraySubscribers = new Set<(event: XRayEvent) => void>();
const MAX_BUFFER = 1000;

// Add event and notify subscribers
export function recordXRayEvent(event: Omit<XRayEvent, 'id' | 'timestamp' | 'targetLayer'> & { targetLayer?: string }) {
  const fullEvent: XRayEvent = {
    id: generateId(),
    timestamp: Date.now(),
    targetLayer: event.targetLayer || getLayerFromPath(event.path),
    ...event,
  };

  xrayEventBuffer.push(fullEvent);
  if (xrayEventBuffer.length > MAX_BUFFER) {
    xrayEventBuffer = xrayEventBuffer.slice(-MAX_BUFFER);
  }

  xraySubscribers.forEach((callback) => {
    try {
      callback(fullEvent);
    } catch {
      // Subscriber error, ignore
    }
  });

  return fullEvent;
}

// Subscribe to events
export function subscribeToXRayEvents(callback: (event: XRayEvent) => void): () => void {
  xraySubscribers.add(callback);
  return () => {
    xraySubscribers.delete(callback);
  };
}

// Get recent events
export function getRecentXRayEvents(limit = 100, since = 0): XRayEvent[] {
  return xrayEventBuffer
    .filter((e) => e.timestamp > since)
    .slice(-limit);
}

// Clear events
export function clearXRayEvents() {
  xrayEventBuffer = [];
}

// Wrap a fetch call with X-Ray instrumentation
export function instrumentedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  sourceLayer: 'pages' | 'client' | 'server' | 'external' = 'client'
): Promise<Response> {
  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method || 'GET';

  return fetch(input, init)
    .then((response) => {
      const duration = Date.now() - startTime;
      const path = new URL(url, 'http://localhost').pathname;

      recordXRayEvent({
        method,
        path,
        status: response.status,
        duration,
        layer: getLayerFromPath(path),
        sourceLayer,
      });

      return response;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      const path = new URL(url, 'http://localhost').pathname;

      recordXRayEvent({
        method,
        path,
        status: 0,
        duration,
        layer: getLayerFromPath(path),
        sourceLayer,
        error: error.message,
      });

      throw error;
    });
}

// Higher-order function to wrap API route handlers
export function withXRayInstrumentation<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  routePath: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const request = args[0] as Request;
    const method = request?.method || 'GET';

    try {
      const response = await handler(...args);
      const duration = Date.now() - startTime;

      recordXRayEvent({
        method,
        path: routePath,
        status: response.status,
        duration,
        layer: getLayerFromPath(routePath),
        sourceLayer: 'pages',
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      recordXRayEvent({
        method,
        path: routePath,
        status: 500,
        duration,
        layer: getLayerFromPath(routePath),
        sourceLayer: 'pages',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }) as T;
}

// Simulation mode - generate synthetic traffic for demo
let simulationInterval: NodeJS.Timeout | null = null;

const SIMULATED_ROUTES = [
  { path: '/api/contexts', methods: ['GET', 'POST'], layer: 'client' },
  { path: '/api/ideas', methods: ['GET', 'POST'], layer: 'client' },
  { path: '/api/goals', methods: ['GET', 'PUT'], layer: 'client' },
  { path: '/api/projects', methods: ['GET'], layer: 'client' },
  { path: '/api/llm/generate', methods: ['POST'], layer: 'server' },
  { path: '/api/scan-queue', methods: ['GET', 'POST'], layer: 'server' },
  { path: '/api/claude-code', methods: ['POST'], layer: 'server' },
  { path: '/api/structure-scan', methods: ['POST'], layer: 'server' },
  { path: '/api/voicebot/llm', methods: ['POST'], layer: 'external' },
  { path: '/api/tester/screenshot', methods: ['POST'], layer: 'external' },
  { path: '/api/dependencies/scan', methods: ['POST'], layer: 'external' },
];

export function startXRaySimulation(intensity: 'low' | 'medium' | 'high' = 'medium') {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  const intervalMs = intensity === 'high' ? 200 : intensity === 'medium' ? 500 : 1000;

  simulationInterval = setInterval(() => {
    // Generate 1-3 events per tick
    const eventCount = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < eventCount; i++) {
      const route = SIMULATED_ROUTES[Math.floor(Math.random() * SIMULATED_ROUTES.length)];
      const method = route.methods[Math.floor(Math.random() * route.methods.length)];

      // Simulate realistic latencies
      let duration: number;
      if (route.layer === 'external') {
        duration = 100 + Math.random() * 500; // External calls are slower
      } else if (route.layer === 'server') {
        duration = 50 + Math.random() * 200;
      } else {
        duration = 10 + Math.random() * 100;
      }

      // Occasional errors (5% rate)
      const status = Math.random() < 0.05 ? (Math.random() < 0.5 ? 400 : 500) : 200;

      recordXRayEvent({
        method,
        path: route.path,
        status,
        duration: Math.round(duration),
        layer: route.layer,
        sourceLayer: 'pages',
      });
    }
  }, intervalMs);
}

export function stopXRaySimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

export function isXRaySimulationRunning(): boolean {
  return simulationInterval !== null;
}
