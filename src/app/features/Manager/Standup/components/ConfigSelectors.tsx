/**
 * Configuration Selector Components
 * Interval, Autonomy Level, and Strategy selectors
 */

'use client';

import { Clock } from 'lucide-react';
import { INTERVAL_OPTIONS, AUTONOMY_OPTIONS, STRATEGY_OPTIONS } from '../constants';
import type { AutomationConfig, OptionConfig } from '../types';

interface IntervalSelectorProps {
  currentInterval: number | undefined;
  onSelect: (interval: number) => void;
}

export function IntervalSelector({ currentInterval, onSelect }: IntervalSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <Clock className="w-3.5 h-3.5 text-gray-500" />
      <div className="flex bg-gray-800/50 rounded-lg p-0.5">
        {INTERVAL_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              currentInterval === opt.value
                ? 'bg-purple-500/30 text-purple-300'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            title={`Check every ${opt.label}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface AutonomySelectorProps {
  currentLevel: AutomationConfig['autonomyLevel'] | undefined;
  onSelect: (level: AutomationConfig['autonomyLevel']) => void;
}

export function AutonomySelector({ currentLevel, onSelect }: AutonomySelectorProps) {
  const currentOption = AUTONOMY_OPTIONS.find(o => o.value === currentLevel) || AUTONOMY_OPTIONS[1];

  return (
    <div className="flex items-center gap-1">
      <div className="flex bg-gray-800/50 rounded-lg p-0.5">
        {AUTONOMY_OPTIONS.map(opt => {
          const Icon = opt.icon!;
          const isSelected = currentLevel === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value as AutomationConfig['autonomyLevel'])}
              className={`p-1.5 rounded transition-colors ${
                isSelected
                  ? `${opt.bg} ${opt.color} border ${opt.border}`
                  : 'text-gray-400 hover:text-gray-300 border border-transparent'
              }`}
              title={opt.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
      <span className={`text-xs font-medium ${currentOption.color}`}>
        {currentOption.label}
      </span>
    </div>
  );
}

interface StrategySelectorProps {
  currentStrategy: AutomationConfig['strategy'] | undefined;
  onSelect: (strategy: AutomationConfig['strategy']) => void;
}

export function StrategySelector({ currentStrategy, onSelect }: StrategySelectorProps) {
  const currentOption = STRATEGY_OPTIONS.find(o => o.value === currentStrategy) || STRATEGY_OPTIONS[0];

  return (
    <div className="flex items-center gap-1">
      <div className="flex bg-gray-800/50 rounded-lg p-0.5">
        {STRATEGY_OPTIONS.map(opt => {
          const Icon = opt.icon!;
          const isSelected = currentStrategy === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value as AutomationConfig['strategy'])}
              className={`p-1.5 rounded transition-colors ${
                isSelected
                  ? `${opt.bg} ${opt.color} border ${opt.border}`
                  : 'text-gray-400 hover:text-gray-300 border border-transparent'
              }`}
              title={opt.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
      <span className={`text-xs font-medium ${currentOption.color}`}>
        {currentOption.label}
      </span>
    </div>
  );
}
