/**
 * forceLayout.worker.ts
 * Web Worker that runs D3 force simulation off the main thread.
 *
 * Receives groups and config, runs simulation ticks, and posts back
 * positioned layouts incrementally so the canvas can render progressively.
 */

import { BUBBLE_PADDING } from './constants';
import type { WorkerGroup, ForceLayoutConfig, WorkerInputMessage, WorkerOutputMessage } from './types';
import { createForceSimulation, initCircularPositions } from '../../lib/forceLayoutConfig';

// Worker message handler
self.onmessage = (e: MessageEvent<WorkerInputMessage>) => {
  const { type, groups, config } = e.data;

  if (type !== 'run') return;

  const { width, height, totalTicks, progressInterval } = config;

  // Guard: empty groups would cause NaN from division by zero
  if (groups.length === 0) {
    self.postMessage({ type: 'complete', groups: [], tick: 0, totalTicks: 0 });
    return;
  }

  // Initialize groups in a circle
  initCircularPositions(groups, width, height);

  // Create D3 simulation using shared factory
  const simulation = createForceSimulation(groups as any, { width, height, collidePadding: BUBBLE_PADDING });

  // Run simulation ticks and post incremental updates
  for (let tick = 0; tick < totalTicks; tick++) {
    simulation.tick();

    // Post progress updates at intervals
    if (tick % progressInterval === 0 || tick === totalTicks - 1) {
      const message: WorkerOutputMessage = {
        type: tick === totalTicks - 1 ? 'complete' : 'progress',
        groups: groups.map(g => ({
          id: g.id,
          radius: g.radius,
          x: (g as any).x ?? width / 2,
          y: (g as any).y ?? height / 2,
        })),
        tick: tick + 1,
        totalTicks,
      };

      self.postMessage(message);
    }
  }
};
