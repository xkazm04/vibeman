'use client';

import { motion } from 'framer-motion';

interface RiskScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  trend?: 'improving' | 'stable' | 'degrading';
}

/**
 * RiskScoreGauge - Visual gauge display for risk scores
 *
 * Shows a circular gauge with color-coded risk level
 * - Green: 0-30 (Low Risk)
 * - Yellow: 31-70 (Medium Risk)
 * - Red: 71-100 (High Risk)
 */
export default function RiskScoreGauge({
  score,
  size = 'md',
  showLabel = true,
  trend,
}: RiskScoreGaugeProps) {
  const sizeConfig = {
    sm: { radius: 40, stroke: 6, fontSize: 'text-xl' },
    md: { radius: 60, stroke: 8, fontSize: 'text-3xl' },
    lg: { radius: 80, stroke: 10, fontSize: 'text-4xl' },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const getColor = (score: number) => {
    if (score <= 30) return { stroke: '#22c55e', text: 'text-green-400', label: 'Low Risk' };
    if (score <= 70) return { stroke: '#eab308', text: 'text-yellow-400', label: 'Medium Risk' };
    return { stroke: '#ef4444', text: 'text-red-400', label: 'High Risk' };
  };

  const colorConfig = getColor(score);

  const trendIcons = {
    improving: '↓',
    stable: '→',
    degrading: '↑',
  };

  const trendColors = {
    improving: 'text-green-400',
    stable: 'text-gray-400',
    degrading: 'text-red-400',
  };

  return (
    <div className="flex flex-col items-center" data-testid="risk-score-gauge">
      <div className="relative" style={{ width: config.radius * 2 + 20, height: config.radius * 2 + 20 }}>
        <svg
          className="transform -rotate-90"
          width={config.radius * 2 + 20}
          height={config.radius * 2 + 20}
        >
          {/* Background circle */}
          <circle
            cx={config.radius + 10}
            cy={config.radius + 10}
            r={config.radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={config.stroke}
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx={config.radius + 10}
            cy={config.radius + 10}
            r={config.radius}
            stroke={colorConfig.stroke}
            strokeWidth={config.stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.fontSize} font-light ${colorConfig.text}`}>
            {score}
          </span>
          {trend && (
            <span className={`text-sm ${trendColors[trend]}`}>
              {trendIcons[trend]}
            </span>
          )}
        </div>
      </div>
      {showLabel && (
        <span className={`mt-2 text-sm ${colorConfig.text}`}>
          {colorConfig.label}
        </span>
      )}
    </div>
  );
}
