/**
 * Standup Configuration
 * Constants and configs for standup automation
 */

import { Shield, Settings, Zap, Rocket, Sparkles } from 'lucide-react';

export const INTERVALS = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
] as const;

export const AUTONOMY_LEVELS = [
  { value: 'supervised', label: 'Supervised', icon: Shield },
  { value: 'semi_autonomous', label: 'Semi-Auto', icon: Settings },
  { value: 'full_autonomous', label: 'Full Auto', icon: Zap },
] as const;

export const STRATEGIES = [
  { value: 'build', label: 'Build', icon: Rocket },
  { value: 'polish', label: 'Polish', icon: Sparkles },
] as const;

export type AutomationConfig = {
  intervalMinutes: number;
  autonomyLevel: 'supervised' | 'semi_autonomous' | 'full_autonomous';
  strategy: 'build' | 'polish';
};

export type AutomationStatus = {
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
  currentPhase: string | null;
};
