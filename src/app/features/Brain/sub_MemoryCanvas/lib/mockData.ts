import type { SignalType, BrainEvent } from './types';
import { CONTEXT_NAMES, SUMMARIES } from './constants';

export function generateEvents(): BrainEvent[] {
  const now = Date.now();
  const span = 14 * 24 * 60 * 60 * 1000;
  const start = now - span;
  const events: BrainEvent[] = [];
  let seed = 314159;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  const SIGNAL_TYPES: SignalType[] = ['git_activity', 'api_focus', 'context_focus', 'implementation'];

  const groupWeights = CONTEXT_NAMES.map(() => 0.3 + rand() * 1.7);
  const totalWeight = groupWeights.reduce((a, b) => a + b, 0);
  const groupCounts = groupWeights.map(w => Math.max(3, Math.round((w / totalWeight) * 100)));

  let eventId = 0;
  for (let gi = 0; gi < CONTEXT_NAMES.length; gi++) {
    const count = groupCounts[gi];
    for (let i = 0; i < count; i++) {
      const type = SIGNAL_TYPES[Math.floor(rand() * 4)];
      const sums = SUMMARIES[type];
      const ageBias = rand() < 0.4 ? rand() * 0.15 : rand();
      const ts = start + ageBias * span;

      events.push({
        id: `ev-${eventId++}`,
        type,
        context_id: `ctx-${gi}`,
        context_name: CONTEXT_NAMES[gi],
        timestamp: Math.min(ts, now),
        weight: 0.2 + rand() * 1.8,
        summary: sums[Math.floor(rand() * sums.length)],
        x: 0,
        y: 0,
      });
    }
  }
  return events;
}
