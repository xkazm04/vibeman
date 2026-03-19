'use client';

interface BrainPanelHeaderProps {
  icon: React.ElementType;
  title: string;
  accentColor: string;
  glowColor: string;
  glow?: boolean;
  count?: number | string;
  trailing?: React.ReactNode;
  right?: React.ReactNode;
}

/**
 * Brain Panel Header — Grid style.
 * Dot indicator + monospace title. No glow, no text-shadow.
 */
export default function BrainPanelHeader({
  icon: Icon,
  title,
  accentColor,
  count,
  trailing,
  right,
}: BrainPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/70">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
        <h3 className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">{title}</h3>
        {count !== undefined && (
          <span className="text-2xs font-mono tabular-nums" style={{ color: accentColor, opacity: 0.7 }}>
            [{count}]
          </span>
        )}
        {trailing}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}
