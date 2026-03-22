'use client';

import type { ReactNode } from 'react';

interface SectionHeadingProps {
  children: ReactNode;
  className?: string;
}

/**
 * SectionHeading — secondary heading for in-panel section labels.
 * Enforces consistent typography: font-mono text-2xs uppercase tracking-wider text-zinc-500 mb-2.
 *
 * For primary panel titles, use BrainPanelHeader instead.
 */
export default function SectionHeading({ children, className = '' }: SectionHeadingProps) {
  return (
    <h3 className={`text-2xs font-mono uppercase tracking-wider text-zinc-500 mb-2 ${className}`}>
      {children}
    </h3>
  );
}
