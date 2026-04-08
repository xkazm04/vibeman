/**
 * Micro-Constellation Render Pass
 *
 * Renders semantic sub-clusters as glowing micro-constellations inside
 * group bubbles. Each cluster's signals are connected by faint luminous
 * threads, with a soft nebula glow at the cluster centroid.
 */

import type { BrainEvent, Group, SemanticSubCluster, FilterState } from './types';
import { COLORS } from './constants';
import { colorAt, hexRgb } from './helpers';
import { DISPLAY_FONT } from '../../lib/brainFonts';

interface MicroConstellationConfig {
  /** The group to render constellations for */
  group: Group;
  /** Current zoom scale */
  k: number;
  /** Current timestamp for animation */
  now: number;
  /** Filter state */
  filterState?: FilterState;
}

/**
 * Render micro-constellations for a group's semantic clusters.
 * Called from within renderGroupBubble after event dots are drawn.
 * Assumes the canvas is already in world-space transform.
 */
export function renderMicroConstellations(
  ctx: CanvasRenderingContext2D,
  config: MicroConstellationConfig,
): void {
  const { group, k, now, filterState } = config;
  const { semanticClusters, events } = group;

  if (!semanticClusters || semanticClusters.length === 0) return;

  // Build event lookup
  const eventMap = new Map<string, BrainEvent>();
  for (const evt of events) {
    eventMap.set(evt.id, evt);
  }

  // Gentle pulse for constellation glow
  const pulsePhase = (now % 4000) / 4000;
  const breathe = 0.7 + 0.3 * Math.sin(pulsePhase * Math.PI * 2);

  for (const cluster of semanticClusters) {
    const clusterEvents = cluster.signalIds
      .map(id => eventMap.get(id))
      .filter((e): e is BrainEvent => {
        if (!e) return false;
        if (filterState && !filterState.visibleTypes.has(e.type)) return false;
        return true;
      });

    if (clusterEvents.length < 2) continue;

    // Compute cluster centroid
    let cx = 0, cy = 0;
    for (const evt of clusterEvents) {
      cx += evt.x;
      cy += evt.y;
    }
    cx /= clusterEvents.length;
    cy /= clusterEvents.length;

    // Determine cluster color (blend of member colors)
    const typeCounts: Record<string, number> = {};
    for (const evt of clusterEvents) {
      typeCounts[evt.type] = (typeCounts[evt.type] || 0) + 1;
    }
    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
    const clusterColor = COLORS[dominantType as keyof typeof COLORS] || '#a8a2c8';

    // ─── Nebula Glow at Centroid ─────────────────────────────────────
    const glowRadius = Math.max(20, clusterEvents.length * 8) / Math.max(0.7, k * 0.5);
    const glowAlpha = cluster.coherence * 0.12 * breathe;

    ctx.save();
    ctx.globalAlpha = glowAlpha;
    ctx.fillStyle = clusterColor;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner brighter core
    ctx.globalAlpha = glowAlpha * 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ─── Luminous Threads Between Cluster Members ────────────────────
    ctx.save();
    const lineAlpha = cluster.coherence * 0.18 * breathe;
    ctx.strokeStyle = colorAt(clusterColor, lineAlpha);
    ctx.lineWidth = 1.2 / Math.max(0.7, k);

    // Connect each event to the centroid (star topology)
    for (const evt of clusterEvents) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(evt.x, evt.y);
      ctx.stroke();
    }

    // Also connect nearest neighbors within cluster for constellation effect
    if (clusterEvents.length >= 3 && clusterEvents.length <= 12) {
      ctx.strokeStyle = colorAt(clusterColor, lineAlpha * 0.6);
      ctx.lineWidth = 0.8 / Math.max(0.7, k);

      for (let i = 0; i < clusterEvents.length; i++) {
        const a = clusterEvents[i];
        // Find nearest 2 neighbors
        const distances = clusterEvents
          .map((b, j) => ({ idx: j, dist: Math.hypot(b.x - a.x, b.y - a.y) }))
          .filter(d => d.idx !== i)
          .sort((x, y) => x.dist - y.dist)
          .slice(0, 2);

        for (const d of distances) {
          const b = clusterEvents[d.idx];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // ─── Cluster Label (only at sufficient zoom) ─────────────────────
    if (k > 1.0 && cluster.centroidTerms.length > 0) {
      const labelText = cluster.centroidTerms.slice(0, 2).join(' · ');
      const fontSize = Math.max(7, Math.round(8 / Math.max(0.7, k)));

      ctx.save();
      ctx.font = `500 ${fontSize}px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Background pill
      const metrics = ctx.measureText(labelText);
      const pillW = metrics.width + 8 / k;
      const pillH = fontSize + 4 / k;
      const pillX = cx - pillW / 2;
      const pillY = cy - glowRadius * 0.6 - pillH;

      ctx.fillStyle = `rgba(15,15,17,0.7)`;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 3 / k);
      ctx.fill();

      ctx.fillStyle = colorAt(clusterColor, 0.8);
      ctx.fillText(labelText, cx, pillY + pillH / 2);
      ctx.restore();
    }
  }
}

/**
 * Render convergence indicators — glowing arcs between groups that
 * share semantic concepts. Called in overview mode after all group bubbles.
 */
export function renderConvergenceArcs(
  ctx: CanvasRenderingContext2D,
  groups: Group[],
  convergenceEvents: Array<{ concept: string[]; contextNames: string[]; strength: number }>,
  k: number,
  now: number,
): void {
  if (convergenceEvents.length === 0) return;

  const groupMap = new Map<string, Group>();
  for (const g of groups) {
    groupMap.set(g.name, g);
  }

  const pulsePhase = (now % 3000) / 3000;
  const arcBreathe = 0.6 + 0.4 * Math.sin(pulsePhase * Math.PI * 2);

  ctx.save();

  for (const event of convergenceEvents) {
    if (event.contextNames.length < 2) continue;

    const groupA = groupMap.get(event.contextNames[0]);
    const groupB = groupMap.get(event.contextNames[1]);
    if (!groupA || !groupB) continue;

    const alpha = event.strength * 0.25 * arcBreathe;

    // Curved arc between groups
    const midX = (groupA.x + groupB.x) / 2;
    const midY = (groupA.y + groupB.y) / 2;
    const dx = groupB.x - groupA.x;
    const dy = groupB.y - groupA.y;
    // Perpendicular offset for curve
    const dist = Math.hypot(dx, dy);
    const curvature = dist * 0.2;
    const cpX = midX - (dy / dist) * curvature;
    const cpY = midY + (dx / dist) * curvature;

    // Gradient arc
    ctx.beginPath();
    ctx.moveTo(groupA.x, groupA.y);
    ctx.quadraticCurveTo(cpX, cpY, groupB.x, groupB.y);
    ctx.strokeStyle = colorAt('#c4b5fd', alpha);
    ctx.lineWidth = (1.5 + event.strength * 2) / k;
    ctx.setLineDash([6 / k, 4 / k]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Convergence label at midpoint
    if (k > 0.7 && event.concept.length > 0) {
      const label = event.concept.slice(0, 2).join(' · ');
      const fontSize = Math.max(7, Math.round(8 / k));

      ctx.font = `italic 500 ${fontSize}px ${DISPLAY_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(15,15,17,0.75)';
      ctx.beginPath();
      ctx.roundRect(cpX - tw / 2 - 4 / k, cpY - fontSize / 2 - 2 / k, tw + 8 / k, fontSize + 4 / k, 3 / k);
      ctx.fill();

      ctx.fillStyle = colorAt('#c4b5fd', 0.7 * arcBreathe);
      ctx.fillText(label, cpX, cpY);
    }
  }

  ctx.restore();
}
