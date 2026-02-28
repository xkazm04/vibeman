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
  Sparkles,
  Heart,
  Wrench,
  Link2,
  Target,
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
  tech_innovator: {
    label: 'Tony Stark',
    icon: Wrench,
    color: 'text-red-400',
    borderColor: 'border-red-500/40',
    bgGradient: 'from-red-500/5 to-amber-500/2',
    description: 'Tech stack mastery & innovative engineering'
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
  code_refactor: {
    label: 'Code Refactor',
    icon: Wrench,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgGradient: 'from-emerald-500/5 to-emerald-600/2',
    description: 'Code cleanup, dead code removal & structure'
  },
  user_empathy_champion: {
    label: 'User Empathy Champion',
    icon: Heart,
    color: 'text-fuchsia-400',
    borderColor: 'border-fuchsia-500/40',
    bgGradient: 'from-fuchsia-500/5 to-fuchsia-600/2',
    description: 'Human-centered design & emotional UX'
  },
  competitor_analyst: {
    label: 'Competitor Analyst',
    icon: Target,
    color: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    bgGradient: 'from-sky-500/5 to-sky-600/2',
    description: 'Analyze competitors & improve features'
  },
  paradigm_shifter: {
    label: 'Paradigm Shifter',
    icon: Brain,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgGradient: 'from-amber-500/5 to-amber-600/2',
    description: 'Revolutionary reimagination of features'
  },
  moonshot_architect: {
    label: 'Moonshot Architect',
    icon: Compass,
    color: 'text-slate-400',
    borderColor: 'border-slate-500/40',
    bgGradient: 'from-slate-500/5 to-slate-600/2',
    description: 'Ambitious 10x opportunities'
  },
  dev_experience_engineer: {
    label: 'Dev Experience Engineer',
    icon: Wrench,
    color: 'text-gray-400',
    borderColor: 'border-gray-500/40',
    bgGradient: 'from-gray-500/5 to-gray-600/2',
    description: 'Developer productivity & codebase joy'
  },
  data_flow_optimizer: {
    label: 'Data Flow Optimizer',
    icon: Zap,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgGradient: 'from-blue-500/5 to-blue-600/2',
    description: 'Data architecture & state management'
  },
  pragmatic_integrator: {
    label: 'Pragmatic Integrator',
    icon: Link2,
    color: 'text-lime-400',
    borderColor: 'border-lime-500/40',
    bgGradient: 'from-lime-500/5 to-lime-600/2',
    description: 'E2E usability, simplification & consolidation'
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
