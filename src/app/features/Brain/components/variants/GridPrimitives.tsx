'use client';

/**
 * Brain Grid Primitives — The standard Brain component system
 *
 * Philosophy: Engineering precision. Structured, measurable, aligned.
 * Thin borders, no shadows/glow, monochrome with single accent (cyan).
 * Dot grid background, monospace data, compact and information-dense.
 *
 * Replaces: GlowCard, BrainPanelHeader, and all decorative chrome.
 */

import type { ReactNode } from 'react';

// ── Grid Background ───────────────────────────────────────────────────────────

export function GridBackground({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(113,113,122,0.15) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {children}
    </div>
  );
}

// ── Panel: bordered box with floating label tab ───────────────────────────────
// Replaces GlowCard entirely. No glow, no backdrop-blur, no mouseGlow.

interface GridPanelProps {
  label?: string;
  children: ReactNode;
  className?: string;
  noBorder?: boolean;
}

export function GridPanel({ label, children, className = '', noBorder }: GridPanelProps) {
  return (
    <div className={`relative ${!noBorder ? 'border border-zinc-800/70 rounded-sm' : ''} ${className}`}>
      {label && (
        <div className="absolute -top-2.5 left-3 px-1.5 bg-zinc-950">
          <span className="text-2xs font-mono font-medium text-cyan-500/80 uppercase tracking-widest">
            {label}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Header: dot indicator + monospace title ───────────────────────────────────
// Replaces BrainPanelHeader. No glow icon, no text-shadow, no neon badges.

interface GridHeaderProps {
  title: string;
  count?: number | string;
  right?: ReactNode;
  /** Optional status dot color (defaults to cyan) */
  dotColor?: string;
}

export function GridHeader({ title, count, right, dotColor }: GridHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/70">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor || 'rgba(6,182,212,0.6)' }} />
        <h3 className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">{title}</h3>
        {count !== undefined && (
          <span className="text-2xs font-mono text-cyan-500/70 tabular-nums">[{count}]</span>
        )}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

// ── Row: grid-aligned interactive item ────────────────────────────────────────

interface GridRowProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function GridRow({ children, onClick, active, className = '' }: GridRowProps) {
  const base = 'px-3 py-1.5 font-mono text-xs border-b border-zinc-800/30 last:border-0 transition-colors';
  const interactive = onClick ? 'cursor-pointer hover:bg-cyan-500/5' : '';
  const activeStyle = active ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500/50' : '';

  return onClick ? (
    <button onClick={onClick} className={`w-full text-left ${base} ${interactive} ${activeStyle} ${className}`}>
      {children}
    </button>
  ) : (
    <div className={`${base} ${activeStyle} ${className}`}>{children}</div>
  );
}

// ── Metric: boxed KPI number ──────────────────────────────────────────────────

interface GridMetricProps {
  value: string | number;
  label: string;
  unit?: string;
  /** Optional color for value text (defaults to cyan) */
  valueColor?: string;
}

export function GridMetric({ value, label, unit, valueColor }: GridMetricProps) {
  return (
    <div className="border border-zinc-800/70 rounded-sm p-2.5">
      <div className="flex items-baseline gap-0.5">
        <span className={`text-lg font-mono font-semibold tabular-nums ${valueColor || 'text-cyan-400'}`}>{value}</span>
        {unit && <span className="text-2xs font-mono text-zinc-500">{unit}</span>}
      </div>
      <p className="text-2xs font-mono text-zinc-600 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

// ── Tag: bordered label ───────────────────────────────────────────────────────

interface GridTagProps {
  children: ReactNode;
  color?: 'default' | 'green' | 'red' | 'amber' | 'cyan' | 'blue' | 'purple';
}

const TAG_COLORS: Record<string, string> = {
  default: 'text-zinc-500 border-zinc-700/50',
  green: 'text-emerald-400 border-emerald-500/30',
  red: 'text-red-400 border-red-500/30',
  amber: 'text-amber-400 border-amber-500/30',
  cyan: 'text-cyan-400 border-cyan-500/30',
  blue: 'text-blue-400 border-blue-500/30',
  purple: 'text-purple-400 border-purple-500/30',
};

export function GridTag({ children, color = 'default' }: GridTagProps) {
  return (
    <span className={`text-2xs font-mono px-1 py-0.5 border rounded-sm ${TAG_COLORS[color] || TAG_COLORS.default}`}>
      {children}
    </span>
  );
}

// ── Sidebar Layout ────────────────────────────────────────────────────────────

interface GridSidebarLayoutProps {
  sidebar: ReactNode;
  content: ReactNode;
  sidebarWidth?: string;
}

export function GridSidebarLayout({ sidebar, content, sidebarWidth = 'w-52' }: GridSidebarLayoutProps) {
  return (
    <GridBackground className="flex-1 flex overflow-hidden">
      <div className={`${sidebarWidth} flex-shrink-0 overflow-y-auto border-r border-zinc-800/70`}>
        {sidebar}
      </div>
      <div className="flex-1 overflow-auto">
        {content}
      </div>
    </GridBackground>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface GridToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
}

export function GridToolbar({ left, right }: GridToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/70 bg-zinc-950/80 flex-shrink-0">
      <div className="flex items-center gap-3">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

interface GridButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
}

export function GridButton({ children, onClick, variant = 'default', disabled }: GridButtonProps) {
  const styles = variant === 'primary'
    ? 'text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/10 hover:border-cyan-500/60'
    : variant === 'danger'
    ? 'text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50'
    : 'text-zinc-500 border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-0.5 text-2xs font-mono border rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles}`}
    >
      {children}
    </button>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

interface GridTableProps {
  headers: string[];
  children: ReactNode;
}

export function GridTable({ headers, children }: GridTableProps) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-zinc-800/70">
            {headers.map(h => (
              <th key={h} className="px-3 py-1.5 text-left text-2xs font-medium text-zinc-600 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/30">
          {children}
        </tbody>
      </table>
    </div>
  );
}

// ── StatusDot: inline status indicator ────────────────────────────────────────

interface GridStatusDotProps {
  status: 'running' | 'completed' | 'failed' | 'idle' | 'pending';
  pulse?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-blue-400',
  completed: 'bg-emerald-400',
  failed: 'bg-red-400',
  idle: 'bg-zinc-500',
  pending: 'bg-amber-400',
};

export function GridStatusDot({ status, pulse }: GridStatusDotProps) {
  return (
    <span className="relative flex items-center justify-center w-2 h-2">
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[status] || STATUS_COLORS.idle}`} />
      {pulse && <span className={`absolute inset-0 rounded-full ${STATUS_COLORS[status] || STATUS_COLORS.idle} animate-ping opacity-40`} />}
    </span>
  );
}
