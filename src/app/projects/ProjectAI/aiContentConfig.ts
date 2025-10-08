import { FileText, CheckSquare, Target, Search, Code2, ScanLine } from 'lucide-react';

export interface AIContentCard {
  id: string;
  title: string;
  description: string;
  bulletPoints?: string[];
  icon: any;
  gradient: string;
  borderColor: string;
  hoverGradient: string;
  iconColor: string;
}

export const codebaseScanCards: AIContentCard[] = [
  {
    id: 'docs',
    title: 'AI Docs',
    description: 'Create intelligent documentation that understands your project architecture.',
    bulletPoints: [
      'Automatically generates README and technical documentation',
      'Analyzes code patterns and architectural decisions',
      'Creates context-aware explanations for complex logic'
    ],
    icon: FileText,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    hoverGradient: 'hover:from-blue-500/30 hover:to-cyan-500/30',
    iconColor: 'text-blue-400'
  },
  {
    id: 'context',
    title: 'Context Scanner',
    description: 'Intelligently organize your codebase into logical feature groups.',
    bulletPoints: [
      'Groups related files by functionality and dependencies',
      'Identifies shared components and utilities',
      'Maps data flow between different parts of your app'
    ],
    icon: Search,
    gradient: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    hoverGradient: 'hover:from-green-500/30 hover:to-emerald-500/30',
    iconColor: 'text-green-400'
  },
  {
    id: 'code',
    title: 'Code Scanner',
    description: 'Discover optimization opportunities and architectural improvements.',
    bulletPoints: [
      'Identifies code duplication and refactoring opportunities',
      'Suggests performance improvements and best practices',
      'Analyzes dependency usage and potential security issues'
    ],
    icon: Code2,
    gradient: 'from-slate-500/20 to-blue-500/20',
    borderColor: 'border-slate-500/30',
    hoverGradient: 'hover:from-slate-500/30 hover:to-blue-500/30',
    iconColor: 'text-slate-400'
  },
  {
    id: 'file-scanner',
    title: 'File Scanner',
    description: 'Advanced file analysis and build error detection system.',
    bulletPoints: [
      'Performs comprehensive project structure analysis',
      'Detects and suggests fixes for build errors',
      'Calculates project metrics and code quality scores'
    ],
    icon: ScanLine,
    gradient: 'from-orange-500/20 to-red-500/20',
    borderColor: 'border-orange-500/30',
    hoverGradient: 'hover:from-orange-500/30 hover:to-red-500/30',
    iconColor: 'text-orange-400'
  }
];

export const ideaGenerationCards: AIContentCard[] = [
  {
    id: 'tasks',
    title: 'Task Generator',
    description: 'Generate actionable development tasks based on your project analysis.',
    bulletPoints: [
      'Creates 5 high-impact implementation tasks',
      'Prioritizes tasks by complexity and business value',
      'Provides detailed implementation guidance'
    ],
    icon: CheckSquare,
    gradient: 'from-blue-500/20 to-red-500/20',
    borderColor: 'border-blue-500/30',
    hoverGradient: 'hover:from-blue-500/30 hover:to-red-500/30',
    iconColor: 'text-blue-400'
  },
  {
    id: 'goals',
    title: 'Goal Generator',
    description: 'Define strategic objectives to elevate your application architecture.',
    bulletPoints: [
      'Generates 3 strategic transformation directions',
      'Aligns technical improvements with business goals',
      'Provides roadmap for long-term project evolution'
    ],
    icon: Target,
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    hoverGradient: 'hover:from-amber-500/30 hover:to-orange-500/30',
    iconColor: 'text-amber-400'
  }
];