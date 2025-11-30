'use client';

import {
  Code2,
  Settings2,
  Wand2,
  Eye,
  Layers,
} from 'lucide-react';

export type EditorTab = 'templates' | 'scope' | 'rules' | 'execution' | 'preview';

export interface DSLBuilderTabsProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}

// Tabs configuration
const tabs: { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'templates', label: 'Templates', icon: Wand2 },
  { id: 'scope', label: 'Scope', icon: Layers },
  { id: 'rules', label: 'Rules', icon: Code2 },
  { id: 'execution', label: 'Execution', icon: Settings2 },
  { id: 'preview', label: 'Preview', icon: Eye },
];

/**
 * DSLBuilderTabs - Tab navigation for the DSL Builder
 * 
 * Provides navigation between:
 * - Templates: Start from predefined templates
 * - Scope: Define file patterns to include/exclude
 * - Rules: Create and edit transformation rules
 * - Execution: Configure execution settings
 * - Preview: Preview changes before execution
 */
export default function DSLBuilderTabs({ activeTab, onTabChange }: DSLBuilderTabsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-white/10 pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              isActive
                ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-500'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            data-testid={`dsl-tab-${tab.id}`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
