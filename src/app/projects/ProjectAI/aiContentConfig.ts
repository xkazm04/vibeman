import { FileText, CheckSquare, Target, Search, Code2 } from 'lucide-react';

export interface AIContentCard {
  id: string;
  title: string;
  description: string;
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
    description: 'Generate comprehensive project documentation and analysis',
    icon: FileText,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    hoverGradient: 'hover:from-blue-500/30 hover:to-cyan-500/30',
    iconColor: 'text-blue-400'
  },
  {
    id: 'context',
    title: 'Context Scanner',
    description: 'Analyze codebase and group files into feature contexts',
    icon: Search,
    gradient: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    hoverGradient: 'hover:from-green-500/30 hover:to-emerald-500/30',
    iconColor: 'text-green-400'
  },
  {
    id: 'code',
    title: 'Code Scanner',
    description: 'Identify opportunities to optimize and refactor code structure',
    icon: Code2,
    gradient: 'from-indigo-500/20 to-purple-500/20',
    borderColor: 'border-indigo-500/30',
    hoverGradient: 'hover:from-indigo-500/30 hover:to-purple-500/30',
    iconColor: 'text-indigo-400'
  }
];

export const ideaGenerationCards: AIContentCard[] = [
  {
    id: 'tasks',
    title: 'Task Generator',
    description: 'Generate 5 high-impact implementation tasks for your project',
    icon: CheckSquare,
    gradient: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    hoverGradient: 'hover:from-purple-500/30 hover:to-pink-500/30',
    iconColor: 'text-purple-400'
  },
  {
    id: 'goals',
    title: 'Goal Generator',
    description: 'Generate 3 strategic directions to transform your application',
    icon: Target,
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    hoverGradient: 'hover:from-amber-500/30 hover:to-orange-500/30',
    iconColor: 'text-amber-400'
  }
];