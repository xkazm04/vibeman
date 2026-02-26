/**
 * Voice Lab Timing Bar
 * Horizontal waterfall chart showing per-stage pipeline timing.
 */

'use client';

interface TimingSegment {
  label: string;
  ms: number;
  color: string;
}

interface VoiceLabTimingBarProps {
  sttMs?: number;
  llmMs: number;
  ttsMs?: number;
  totalMs: number;
  ttsCached?: boolean;
}

export default function VoiceLabTimingBar({ sttMs, llmMs, ttsMs, totalMs, ttsCached }: VoiceLabTimingBarProps) {
  const segments: TimingSegment[] = [];

  if (sttMs !== undefined && sttMs >= 0) {
    segments.push({ label: 'STT', ms: sttMs, color: 'bg-blue-500' });
  }

  segments.push({ label: 'LLM', ms: llmMs, color: 'bg-amber-500' });

  if (ttsMs !== undefined && ttsMs >= 0) {
    segments.push({
      label: ttsCached ? 'TTS (cached)' : 'TTS',
      ms: ttsMs,
      color: 'bg-emerald-500',
    });
  }

  const isSlow = totalMs > 2000;
  const barTotal = segments.reduce((sum, s) => sum + s.ms, 0) || 1;

  return (
    <div className="space-y-1">
      {/* Bar */}
      <div className="flex h-5 rounded-md overflow-hidden bg-slate-800/60 border border-slate-700/30">
        {segments.map((seg, i) => {
          const pct = Math.max((seg.ms / barTotal) * 100, 4);
          return (
            <div
              key={i}
              className={`${seg.color}/80 flex items-center justify-center text-2xs font-medium text-white/90 transition-all`}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${seg.ms}ms`}
            >
              {seg.ms > 80 && (
                <span className="truncate px-1">
                  {seg.label} {seg.ms}ms
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-sm ${seg.color}/80`} />
            {seg.label}: {seg.ms}ms
            {barTotal > 0 && (
              <span className="text-slate-600">({Math.round((seg.ms / barTotal) * 100)}%)</span>
            )}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1">
          Total: <span className={isSlow ? 'text-red-400 font-medium' : 'text-slate-400'}>{totalMs}ms</span>
          {isSlow && <span className="text-red-400">slow</span>}
        </span>
      </div>
    </div>
  );
}
