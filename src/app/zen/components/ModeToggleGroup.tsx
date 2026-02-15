'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

export interface ModeOption<T extends string = string> {
  value: T;
  label: string;
  icon: LucideIcon;
  /** CSS gradient string for the sliding background when this mode is active */
  gradient: string;
}

interface ModeToggleGroupProps<T extends string> {
  modes: ModeOption<T>[];
  activeMode: T;
  onModeChange: (mode: T) => void;
  /** Outer container className overrides (bg, border, padding) */
  className?: string;
  /** Size variant: 'sm' for header, 'md' for standalone */
  size?: 'sm' | 'md';
}

// ── Shared spring config ─────────────────────────────────────

const SLIDE_SPRING = { type: 'spring' as const, stiffness: 500, damping: 30 };

// ── Component ────────────────────────────────────────────────

export default function ModeToggleGroup<T extends string>({
  modes,
  activeMode,
  onModeChange,
  className,
  size = 'sm',
}: ModeToggleGroupProps<T>) {
  const currentIndex = modes.findIndex((m) => m.value === activeMode);
  const activeGradient = modes[currentIndex]?.gradient ?? modes[0]?.gradient ?? '';

  const pad = size === 'sm' ? 'p-0.5' : 'p-1';
  const inset = size === 'sm' ? 2 : 4;          // px offset for pill edges
  const btnPad = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const insetClass = size === 'sm' ? 'top-0.5 bottom-0.5' : 'top-1 bottom-1';

  return (
    <div
      className={
        className ??
        `relative flex bg-gray-800/80 rounded-lg ${pad} border border-gray-700/50`
      }
    >
      {/* Sliding background pill */}
      <motion.div
        className={`absolute ${insetClass} rounded-md`}
        style={{
          width: `calc(${100 / modes.length}% - ${inset * 2}px)`,
          background: activeGradient,
        }}
        animate={{
          left: `calc(${currentIndex * (100 / modes.length)}% + ${inset}px)`,
        }}
        transition={SLIDE_SPRING}
      />

      {/* Mode buttons */}
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = activeMode === m.value;
        return (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`
              relative z-10 flex items-center gap-1.5 ${btnPad} rounded-md
              transition-colors duration-200
              ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-300'}
            `}
          >
            <Icon className={iconSize} />
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
