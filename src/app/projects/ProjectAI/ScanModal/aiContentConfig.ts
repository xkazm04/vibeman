import { FileText, ScanLine, LucideIcon } from 'lucide-react';

export interface AIContentCard {
  id: string;
  title: string;
  description: string;
  bulletPoints?: string[];
  icon: LucideIcon;
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
];