'use client';

import type { ReactNode } from 'react';

interface BrainStatusBarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

export default function BrainStatusBar({ left, center, right }: BrainStatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900/70 backdrop-blur-xl border-t border-zinc-800/40 text-xs font-mono">
      <div className="flex items-center gap-4">
        {left}
      </div>
      {center && (
        <div className="flex items-center gap-3">
          {center}
        </div>
      )}
      <div className="flex items-center gap-3">
        {right}
      </div>
    </div>
  );
}
