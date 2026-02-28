'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  Heart,
  Play,
  BarChart3,
  FolderTree,
  Wand2,
  ArrowRight,
  Sparkles,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useOnboardingStore, type AppModule } from '@/stores/onboardingStore';
import { useWorkflowStore, getModuleLabel } from '@/stores/workflowStore';

// Quick action definition
interface QuickActionDef {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  module: AppModule;
  variant: 'primary' | 'secondary' | 'ghost';
}

// Get contextual quick actions based on current module
function getQuickActionsForModule(currentModule: AppModule): QuickActionDef[] {
  switch (currentModule) {
    case 'coder':
      return [
        { id: 'contexts', label: 'Contexts', description: 'Review code organization', icon: FolderTree, module: 'contexts', variant: 'secondary' },
        { id: 'ideas', label: 'Generate Ideas', description: 'Get AI suggestions', icon: Lightbulb, module: 'ideas', variant: 'primary' },
        { id: 'tasker', label: 'Run Tasks', description: 'Execute pending tasks', icon: Play, module: 'tasker', variant: 'secondary' },
      ];

    case 'contexts':
      return [
        { id: 'ideas', label: 'Generate Ideas', description: 'Ideas for selected contexts', icon: Lightbulb, module: 'ideas', variant: 'primary' },
        { id: 'blueprint', label: 'Run Blueprint', description: 'Analyze project structure', icon: Layers, module: 'blueprint', variant: 'secondary' },
        { id: 'coder', label: 'View Goals', description: 'See project goals', icon: Sparkles, module: 'coder', variant: 'ghost' },
      ];

    case 'ideas':
      return [
        { id: 'tinder', label: 'Evaluate Ideas', description: 'Swipe to approve/reject', icon: Heart, module: 'tinder', variant: 'primary' },
        { id: 'contexts', label: 'Filter by Context', description: 'Narrow by code area', icon: FolderTree, module: 'contexts', variant: 'secondary' },
        { id: 'manager', label: 'View Stats', description: 'Idea analytics', icon: BarChart3, module: 'manager', variant: 'ghost' },
      ];

    case 'tinder':
      return [
        { id: 'coder', label: 'Create Goals', description: 'Turn approved into goals', icon: Sparkles, module: 'coder', variant: 'primary' },
        { id: 'tasker', label: 'Run Tasks', description: 'Execute approved ideas', icon: Play, module: 'tasker', variant: 'secondary' },
        { id: 'ideas', label: 'More Ideas', description: 'Generate more suggestions', icon: Lightbulb, module: 'ideas', variant: 'ghost' },
      ];

    case 'tasker':
      return [
        { id: 'reflector', label: 'View Results', description: 'Check execution history', icon: RefreshCw, module: 'reflector', variant: 'secondary' },
        { id: 'manager', label: 'Analytics', description: 'Task statistics', icon: BarChart3, module: 'manager', variant: 'secondary' },
        { id: 'coder', label: 'Goals', description: 'Review project goals', icon: Sparkles, module: 'coder', variant: 'ghost' },
      ];

    case 'manager':
      return [
        { id: 'reflector', label: 'Refactor', description: 'Find improvements', icon: Wand2, module: 'reflector', variant: 'primary' },
        { id: 'contexts', label: 'Contexts', description: 'Organize code areas', icon: FolderTree, module: 'contexts', variant: 'secondary' },
        { id: 'ideas', label: 'Ideas', description: 'Generate suggestions', icon: Lightbulb, module: 'ideas', variant: 'ghost' },
      ];

    case 'reflector':
      return [
        { id: 'tasker', label: 'Run Refactors', description: 'Execute improvements', icon: Play, module: 'tasker', variant: 'primary' },
        { id: 'contexts', label: 'Review Contexts', description: 'Check affected areas', icon: FolderTree, module: 'contexts', variant: 'secondary' },
        { id: 'manager', label: 'Analytics', description: 'View statistics', icon: BarChart3, module: 'manager', variant: 'ghost' },
      ];

    case 'reflector':
      return [
        { id: 'tasker', label: 'New Tasks', description: 'Start more tasks', icon: Play, module: 'tasker', variant: 'secondary' },
        { id: 'manager', label: 'Analytics', description: 'Overall statistics', icon: BarChart3, module: 'manager', variant: 'secondary' },
        { id: 'coder', label: 'Goals', description: 'Review progress', icon: Sparkles, module: 'coder', variant: 'ghost' },
      ];

    case 'blueprint':
      return [
        { id: 'contexts', label: 'Review Contexts', description: 'Check generated contexts', icon: FolderTree, module: 'contexts', variant: 'primary' },
        { id: 'ideas', label: 'Generate Ideas', description: 'Get suggestions', icon: Lightbulb, module: 'ideas', variant: 'secondary' },
        { id: 'coder', label: 'Set Goals', description: 'Define objectives', icon: Sparkles, module: 'coder', variant: 'ghost' },
      ];

    default:
      return [
        { id: 'coder', label: 'Project', description: 'Go to project view', icon: Sparkles, module: 'coder', variant: 'secondary' },
        { id: 'ideas', label: 'Ideas', description: 'Generate suggestions', icon: Lightbulb, module: 'ideas', variant: 'secondary' },
      ];
  }
}

interface QuickActionBarProps {
  className?: string;
}

export default function QuickActionBar({ className = '' }: QuickActionBarProps) {
  const { activeModule, setActiveModule } = useOnboardingStore();
  const { pushStep } = useWorkflowStore();

  const quickActions = useMemo(() => getQuickActionsForModule(activeModule), [activeModule]);

  const handleNavigate = (action: QuickActionDef) => {
    setActiveModule(action.module);
    pushStep({
      module: action.module,
      label: getModuleLabel(action.module),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 ${className}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mr-1">
        Quick:
      </span>
      {quickActions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleNavigate(action)}
            className={`group flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-all ${
              action.variant === 'primary'
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30'
                : action.variant === 'secondary'
                ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-800/80 border border-gray-700/50'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
            title={action.description}
            data-testid={`quick-action-${action.id}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{action.label}</span>
            <ArrowRight className={`w-3 h-3 transition-transform ${
              action.variant === 'primary'
                ? 'text-purple-400 group-hover:translate-x-0.5'
                : 'text-gray-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
            }`} />
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// Compact version for use in feature layouts
export function QuickActionBarCompact({ className = '' }: { className?: string }) {
  const { activeModule, setActiveModule } = useOnboardingStore();
  const { pushStep } = useWorkflowStore();

  const quickActions = useMemo(() => getQuickActionsForModule(activeModule).slice(0, 2), [activeModule]);

  const handleNavigate = (action: QuickActionDef) => {
    setActiveModule(action.module);
    pushStep({
      module: action.module,
      label: getModuleLabel(action.module),
    });
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => handleNavigate(action)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-300 hover:bg-gray-800/30 rounded transition-colors"
            title={action.description}
            data-testid={`quick-action-compact-${action.id}`}
          >
            <Icon className="w-3 h-3" />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
