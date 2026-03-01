'use client';

import React, { useId } from 'react';
import { motion } from 'framer-motion';

export interface LiquidStep {
  id: string;
  label: string;
  tooltip?: string;
  done: boolean;
}

interface LiquidStepRailProps {
  steps: LiquidStep[];
  activeIndex: number;
  className?: string;
  direction?: 'vertical' | 'horizontal';
  accentFrom?: string;
  accentTo?: string;
  /** Show text labels next to each step node */
  showLabels?: boolean;
}

/**
 * LiquidStepRail – SVG-based step indicator with liquid fill connectors
 * and a predictive glow on the next required action.
 */
export default function LiquidStepRail({
  steps,
  activeIndex,
  className = '',
  direction = 'vertical',
  accentFrom = '#a855f7',
  accentTo = '#06b6d4',
  showLabels = true,
}: LiquidStepRailProps) {
  const uid = useId();
  const isVertical = direction === 'vertical';

  const connectorLength = 32;
  const nodeSize = 24;
  const strokeW = 3;

  const stepCount = steps.length;
  const connectorCount = stepCount - 1;
  const totalLength = stepCount * nodeSize + connectorCount * connectorLength;

  const svgW = isVertical ? nodeSize + 8 : totalLength;
  const svgH = isVertical ? totalLength : nodeSize + 8;

  const pos = (i: number) => i * (nodeSize + connectorLength) + nodeSize / 2;

  const connectorFill = (i: number) => {
    if (steps[i].done && steps[i + 1].done) return 1;
    if (steps[i].done && !steps[i + 1].done) return 0.45;
    return 0;
  };

  const svgElement = (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      fill="none"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient
          id={`${uid}-fill`}
          x1="0%"
          y1="0%"
          x2={isVertical ? '0%' : '100%'}
          y2={isVertical ? '100%' : '0%'}
        >
          <stop offset="0%" stopColor={accentFrom} />
          <stop offset="100%" stopColor={accentTo} />
        </linearGradient>

        <filter id={`${uid}-glow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Connectors */}
      {steps.slice(0, -1).map((_, i) => {
        const fill = connectorFill(i);
        const startCenter = pos(i);
        const endCenter = pos(i + 1);
        const lineStart = startCenter + nodeSize / 2;
        const lineEnd = endCenter - nodeSize / 2;

        return (
          <g key={`conn-${i}`}>
            {isVertical ? (
              <>
                <line
                  x1={svgW / 2} y1={lineStart}
                  x2={svgW / 2} y2={lineEnd}
                  stroke="#1f2937"
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                />
                {fill > 0 && (
                  <motion.line
                    x1={svgW / 2} y1={lineStart}
                    x2={svgW / 2}
                    initial={{ y2: lineStart }}
                    animate={{ y2: lineStart + (lineEnd - lineStart) * fill }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    stroke={`url(#${uid}-fill)`}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                  />
                )}
              </>
            ) : (
              <>
                <line
                  x1={lineStart} y1={svgH / 2}
                  x2={lineEnd} y2={svgH / 2}
                  stroke="#1f2937"
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                />
                {fill > 0 && (
                  <motion.line
                    x1={lineStart} y1={svgH / 2}
                    y2={svgH / 2}
                    initial={{ x2: lineStart }}
                    animate={{ x2: lineStart + (lineEnd - lineStart) * fill }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    stroke={`url(#${uid}-fill)`}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                  />
                )}
              </>
            )}
          </g>
        );
      })}

      {/* Step nodes */}
      {steps.map((step, i) => {
        const center = pos(i);
        const cx = isVertical ? svgW / 2 : center;
        const cy = isVertical ? center : svgH / 2;
        const isActive = i === activeIndex;
        const r = nodeSize / 2 - 1;

        return (
          <g key={step.id} role="listitem" aria-label={`${step.label}${step.done ? ' (complete)' : isActive ? ' (current)' : ''}`}>
            {/* Predictive glow on the active/next step */}
            {isActive && !step.done && (
              <motion.circle
                cx={cx}
                cy={cy}
                r={r + 6}
                fill="none"
                stroke={accentTo}
                strokeWidth={1.5}
                filter={`url(#${uid}-glow)`}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Node background */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={step.done ? 'rgba(0,0,0,0.3)' : '#111827'}
              stroke={step.done ? `url(#${uid}-fill)` : isActive ? accentTo : '#374151'}
              strokeWidth={step.done || isActive ? 2 : 1.5}
            />

            {/* Done checkmark or step number */}
            {step.done ? (
              <motion.path
                d={`M${cx - 4} ${cy} l3 3 5-6`}
                stroke={accentFrom}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              />
            ) : (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isActive ? accentTo : '#6b7280'}
                fontSize="10"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
              >
                {i + 1}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );

  // Vertical layout with labels to the right of each node
  if (isVertical && showLabels) {
    return (
      <div className={`relative ${className}`} role="list" aria-label="Progress steps">
        <div className="flex">
          {svgElement}
          <div className="flex flex-col" style={{ height: svgH }}>
            {steps.map((step, i) => {
              const centerY = pos(i);
              const isActive = i === activeIndex;
              return (
                <div
                  key={step.id}
                  className="absolute flex items-center group"
                  style={{ top: centerY - 8, left: svgW + 4 }}
                >
                  <span className={`text-[9px] leading-tight font-medium whitespace-nowrap ${
                    step.done ? 'text-gray-400' : isActive ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  {step.tooltip && (
                    <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 border border-gray-700/60 text-gray-200 text-xs px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50">
                      {step.tooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center ${className}`} role="list" aria-label="Progress steps">
      {svgElement}
    </div>
  );
}
