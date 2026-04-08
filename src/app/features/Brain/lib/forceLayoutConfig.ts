/**
 * Shared D3 force simulation factory.
 *
 * Provides a single-point configuration for the force parameters used by
 * canvasLayout (sync), forceLayout.worker (async), and usePalaceData (rooms).
 */

import * as d3 from 'd3';

export interface ForceSimulationOptions {
  width: number;
  height: number;
  /** Padding added to each node's radius for the collide force */
  collidePadding?: number;
  /** Collide force strength (default: 0.85) */
  collideStrength?: number;
  /** Collide force iterations per tick (default: 3) */
  collideIterations?: number;
  /** Many-body charge strength — negative repels (default: -250) */
  chargeStrength?: number;
  /** Centering x/y force strength (default: 0.04) */
  positioningStrength?: number;
  /** Fraction of min(width,height) for initial circular placement (default: 0.25) */
  initRadiusFraction?: number;
  /** Angle offset for initial circular placement in radians (default: 0) */
  angleOffset?: number;
}

const DEFAULTS = {
  collidePadding: 20,
  collideStrength: 0.85,
  collideIterations: 3,
  chargeStrength: -250,
  positioningStrength: 0.04,
  initRadiusFraction: 0.25,
  angleOffset: 0,
} as const;

/**
 * Place nodes in a circle around the center of the canvas.
 * Mutates nodes in-place.
 */
export function initCircularPositions<T extends { x: number; y: number }>(
  nodes: T[],
  width: number,
  height: number,
  opts?: Pick<ForceSimulationOptions, 'initRadiusFraction' | 'angleOffset'>,
): void {
  if (nodes.length === 0) return;
  const fraction = opts?.initRadiusFraction ?? DEFAULTS.initRadiusFraction;
  const offset = opts?.angleOffset ?? DEFAULTS.angleOffset;
  const angleStep = (2 * Math.PI) / nodes.length;
  const initRadius = Math.min(width, height) * fraction;

  nodes.forEach((n, i) => {
    n.x = width / 2 + initRadius * Math.cos(i * angleStep + offset);
    n.y = height / 2 + initRadius * Math.sin(i * angleStep + offset);
  });
}

/**
 * Create a stopped D3 force simulation with shared force configuration.
 *
 * @param nodes   Array of simulation nodes — must have `radius`, `x`, `y`.
 * @param opts    Layout options (width/height required, rest have defaults).
 * @returns       A stopped `d3.Simulation` ready for manual `.tick()` calls.
 */
export function createForceSimulation<T extends d3.SimulationNodeDatum & { radius: number }>(
  nodes: T[],
  opts: ForceSimulationOptions,
): d3.Simulation<T, undefined> {
  const {
    width,
    height,
    collidePadding = DEFAULTS.collidePadding,
    collideStrength = DEFAULTS.collideStrength,
    collideIterations = DEFAULTS.collideIterations,
    chargeStrength = DEFAULTS.chargeStrength,
    positioningStrength = DEFAULTS.positioningStrength,
  } = opts;

  return d3.forceSimulation(nodes)
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide<T>(d => d.radius + collidePadding).strength(collideStrength).iterations(collideIterations))
    .force('charge', d3.forceManyBody().strength(chargeStrength))
    .force('x', d3.forceX(width / 2).strength(positioningStrength))
    .force('y', d3.forceY(height / 2).strength(positioningStrength))
    .stop();
}
