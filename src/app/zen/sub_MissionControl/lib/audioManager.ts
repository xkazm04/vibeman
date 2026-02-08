/**
 * Mission Control Audio Manager
 * Ambient audio cues for task lifecycle events.
 * Uses Web Audio API for lightweight, procedural sound generation.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Gentle ascending chime for task completion */
export function playCompletionChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  // Two-note ascending chime (C5 → E5)
  [523.25, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.15);
    osc.connect(gain);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.4);
  });
}

/** Low tonal shift for failure */
export function playFailuretone() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

  // Descending minor tone (E4 → C4)
  [329.63, 261.63].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.2);
    osc.connect(gain);
    osc.start(now + i * 0.2);
    osc.stop(now + i * 0.2 + 0.5);
  });
}

/** Rising sweep for launch sequence start */
export function playLaunchSweep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 1.0);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 1.5);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 2.0);
}

/** Soft ping for session start */
export function playSessionPing() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.3);
}
