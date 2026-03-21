/**
 * forceLayout.worker.ts
 * Web Worker that runs D3 force simulation off the main thread.
 *
 * Receives groups and config, runs simulation ticks, and posts back
 * positioned layouts incrementally so the canvas can render progressively.
 */

// Import D3 directly in the worker
import * as d3 from 'd3';
import { BUBBLE_PADDING } from './constants';
import type { WorkerGroup, ForceLayoutConfig, WorkerInputMessage, WorkerOutputMessage } from './types';

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
  const angleStep = (2 * Math.PI) / groups.length;
  const initRadius = Math.min(width, height) * 0.25;

  groups.forEach((g, i) => {
    g.x = width / 2 + initRadius * Math.cos(i * angleStep);
    g.y = height / 2 + initRadius * Math.sin(i * angleStep);
  });

  // Create D3 simulation
  const simulation = d3.forceSimulation(groups as d3.SimulationNodeDatum[])
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide<d3.SimulationNodeDatum>((d: any) => d.radius + BUBBLE_PADDING).strength(0.85).iterations(3))
    .force('charge', d3.forceManyBody().strength(-250))
    .force('x', d3.forceX(width / 2).strength(0.04))
    .force('y', d3.forceY(height / 2).strength(0.04))
    .stop();

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
