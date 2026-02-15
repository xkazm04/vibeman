import { COLORS } from './constants';
import { hexToRgba } from './helpers';
import type { SignalType } from './types';

const PARTICLE_COUNT = 24;
const SIGNAL_KEYS: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: SignalType;
  size: number;
  phase: number;
}

let particles: Particle[] | null = null;

function initParticles(width: number, height: number): Particle[] {
  const result: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    result.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      type: SIGNAL_KEYS[i % 4],
      size: 2 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return result;
}

export function renderEmptyState(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  frameCount: number,
): void {
  if (!particles || particles.length === 0) {
    particles = initParticles(width, height);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0f0f11';
  ctx.fillRect(0, 0, width, height);

  const t = frameCount * 0.016; // ~60fps time in seconds

  // Update & draw particles
  for (const p of particles) {
    p.x += p.vx + Math.sin(t + p.phase) * 0.15;
    p.y += p.vy + Math.cos(t * 0.7 + p.phase) * 0.15;

    // Wrap around edges
    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;
    if (p.y > height + 10) p.y = -10;

    const alpha = 0.04 + Math.sin(t * 0.5 + p.phase) * 0.03;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(COLORS[p.type], alpha);
    ctx.fill();
  }

  // Center concentric rings
  const cx = width / 2;
  const cy = height / 2;
  for (let i = 0; i < 3; i++) {
    const ringRadius = 30 + i * 20 + Math.sin(t * 0.3 + i) * 3;
    const ringAlpha = 0.06 - i * 0.015;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba('#a855f7', ringAlpha);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Central text
  ctx.fillStyle = 'rgba(161,161,170,0.7)';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('No signals yet', cx, cy - 8);

  ctx.fillStyle = 'rgba(113,113,122,0.5)';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('Brain collects signals from task execution, idea reviews & code activity', cx, cy + 14);

  // Signal type dots at bottom
  const dotY = cy + 50;
  const totalW = SIGNAL_KEYS.length * 70;
  const startX = cx - totalW / 2 + 35;

  ctx.font = '9px Inter, system-ui, sans-serif';
  for (let i = 0; i < SIGNAL_KEYS.length; i++) {
    const dx = startX + i * 70;
    const color = COLORS[SIGNAL_KEYS[i]];
    ctx.beginPath();
    ctx.arc(dx - 12, dotY, 3, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(color, 0.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(161,161,170,0.4)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const labels: Record<SignalType, string> = { git_activity: 'Git', api_focus: 'API', context_focus: 'Context', implementation: 'Impl' };
    ctx.fillText(labels[SIGNAL_KEYS[i]], dx - 6, dotY);
  }
}

export function resetEmptyState(): void {
  particles = null;
}
