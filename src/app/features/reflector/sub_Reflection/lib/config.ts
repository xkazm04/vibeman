import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import {
  Brain,
  Bug,
  Zap,
  Shield,
  Lightbulb,
  Scale,
  TrendingUp,
  Palette,
  Compass,
  GraduationCap,
  Sparkles,
  Heart,
  Wrench,
  type LucideIcon
} from 'lucide-react';

export interface ScanTypeConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  borderColor: string;
  bgGradient: string;
  description: string;
}

export const SCAN_TYPE_CONFIG: Record<ScanType, ScanTypeConfig> = {
  zen_architect: {
    label: 'Zen Architect',
    icon: Compass,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgGradient: 'from-cyan-500/5 to-cyan-600/2',
    description: 'Simplicity & elegant design'
  },
  bug_hunter: {
    label: 'Bug Hunter',
    icon: Bug,
    color: 'text-red-400',
    borderColor: 'border-red-500/40',
    bgGradient: 'from-red-500/5 to-red-600/2',
    description: 'Bug detection & prevention'
  },
  perf_optimizer: {
    label: 'Performance Optimizer',
    icon: Zap,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/40',
    bgGradient: 'from-yellow-500/5 to-yellow-600/2',
    description: 'Speed & efficiency improvements'
  },
  security_protector: {
    label: 'Security Protector',
    icon: Shield,
    color: 'text-green-400',
    borderColor: 'border-green-500/40',
    bgGradient: 'from-green-500/5 to-green-600/2',
    description: 'Vulnerabilities & hardening'
  },
  insight_synth: {
    label: 'Insight Synthesizer',
    icon: Lightbulb,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgGradient: 'from-amber-500/5 to-amber-600/2',
    description: 'Revolutionary connections'
  },
  ambiguity_guardian: {
    label: 'Ambiguity Guardian',
    icon: Scale,
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/40',
    bgGradient: 'from-indigo-500/5 to-indigo-600/2',
    description: 'Trade-offs & uncertainty navigation'
  },
  business_visionary: {
    label: 'Business Visionary',
    icon: TrendingUp,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgGradient: 'from-emerald-500/5 to-emerald-600/2',
    description: 'Market opportunities & innovation'
  },
  ui_perfectionist: {
    label: 'UI Perfectionist',
    icon: Palette,
    color: 'text-pink-400',
    borderColor: 'border-pink-500/40',
    bgGradient: 'from-pink-500/5 to-pink-600/2',
    description: 'Component reusability & design'
  },
  feature_scout: {
    label: 'Feature Scout',
    icon: Compass,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgGradient: 'from-blue-500/5 to-blue-600/2',
    description: 'Adjacent feature opportunities'
  },
  onboarding_optimizer: {
    label: 'Onboarding Optimizer',
    icon: GraduationCap,
    color: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgGradient: 'from-orange-500/5 to-orange-600/2',
    description: 'User experience & time-to-value'
  },
  ai_integration_scout: {
    label: 'AI Integration Scout',
    icon: Sparkles,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/40',
    bgGradient: 'from-violet-500/5 to-violet-600/2',
    description: 'AI/ML enhancement opportunities'
  },
  delight_designer: {
    label: 'Delight Designer',
    icon: Heart,
    color: 'text-rose-400',
    borderColor: 'border-rose-500/40',
    bgGradient: 'from-rose-500/5 to-rose-600/2',
    description: 'Wow moments & micro-interactions'
  },
  refactor_analysis: {
    label: 'Refactor Analysis',
    icon: Wrench,
    color: 'text-slate-400',
    borderColor: 'border-slate-500/40',
    bgGradient: 'from-slate-500/5 to-slate-600/2',
    description: 'Code quality & refactoring'
  }
};

// Status color configuration
export const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/40'
  },
  accepted: {
    label: 'Accepted',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/40'
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40'
  },
  implemented: {
    label: 'Implemented',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40'
  }
};
