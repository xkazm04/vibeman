'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import type { Context } from '@/stores/contextStore';
import { ContextEntity, type HealthLevel } from '@/stores/context/ContextEntity';

interface ContextHealthIndicatorProps {
  context: Context;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const healthConfig: Record<HealthLevel, { icon: React.ElementType; color: string; bgColor: string; label: string; dotColor: string }> = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    label: 'Healthy',
    dotColor: 'text-green-400',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    label: 'Needs Attention',
    dotColor: 'text-yellow-400',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Critical',
    dotColor: 'text-red-400',
  },
  unknown: {
    icon: HelpCircle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    label: 'Unknown',
    dotColor: 'text-gray-400',
  },
};

function HealthTooltip({
  anchorRef,
  level,
  issues,
  visible,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  level: HealthLevel;
  issues: string[];
  visible: boolean;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!visible || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2,
    });
  }, [visible, anchorRef]);

  if (!mounted || !visible) return null;

  const config = healthConfig[level];

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl px-3 py-2 text-xs max-w-56">
        <div className={`font-medium ${config.color} mb-1`}>{config.label}</div>
        {issues.length > 0 ? (
          <ul className="space-y-0.5 text-zinc-400">
            {issues.map((issue, i) => (
              <li key={i} className="flex gap-1.5 items-start">
                <span className="text-zinc-600 mt-px">&#8226;</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-500">No issues detected</p>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ContextHealthIndicator({
  context,
  showLabel = false,
  size = 'sm',
  className = '',
}: ContextHealthIndicatorProps) {
  const { level, issues } = ContextEntity.analyzeHealth(context);
  const config = healthConfig[level];
  const Icon = config.icon;
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const containerSize = size === 'sm' ? 'p-1' : 'p-1.5';

  return (
    <>
      <motion.div
        ref={ref}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-1.5 cursor-help ${className}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className={`${containerSize} rounded-full ${config.bgColor} transition-colors duration-200`}>
          <Icon className={`${iconSize} ${config.color} transition-colors duration-200`} />
        </div>
        {showLabel && (
          <span className={`text-xs ${config.color} transition-colors duration-200`}>{config.label}</span>
        )}
      </motion.div>
      <HealthTooltip anchorRef={ref} level={level} issues={issues} visible={hovered} />
    </>
  );
}

/**
 * Compact health indicator for use in tight spaces.
 * Uses distinct icons per level for colorblind accessibility.
 */
export function ContextHealthDot({
  context,
  className = '',
}: {
  context: Context;
  className?: string;
}) {
  const { level, issues } = ContextEntity.analyzeHealth(context);
  const config = healthConfig[level];
  const Icon = config.icon;
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div
        ref={ref}
        className={`inline-flex items-center justify-center cursor-help ${className}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Icon className={`w-3 h-3 ${config.dotColor}`} />
      </div>
      <HealthTooltip anchorRef={ref} level={level} issues={issues} visible={hovered} />
    </>
  );
}

export default ContextHealthIndicator;
