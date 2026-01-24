'use client';

/**
 * TemplateCategoryColumn
 * Wraps CompactList for displaying templates of a specific category
 */

import { useMemo } from 'react';
import { Play, Edit3, Trash2 } from 'lucide-react';
import CompactList, { CompactListItem } from '@/components/lists/CompactList';
import type { PromptTemplateCategory, PromptTemplateVariable } from '@/app/db/models/types';

// Template interface (parsed from API)
export interface PromptTemplate {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  category: PromptTemplateCategory;
  template_content: string;
  variables: PromptTemplateVariable[];
  created_at: string;
  updated_at: string;
}

// Category theme configuration
export const CATEGORY_THEMES: Record<PromptTemplateCategory, {
  gradient: string;
  border: string;
  text: string;
  badge: string;
  icon: string;
}> = {
  storywriting: {
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    icon: 'text-amber-400',
  },
  research: {
    gradient: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300',
    icon: 'text-blue-400',
  },
  code_generation: {
    gradient: 'from-green-500/20 to-green-600/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    badge: 'bg-green-500/20 text-green-300',
    icon: 'text-green-400',
  },
  analysis: {
    gradient: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
    icon: 'text-purple-400',
  },
  review: {
    gradient: 'from-cyan-500/20 to-cyan-600/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300',
    icon: 'text-cyan-400',
  },
  custom: {
    gradient: 'from-pink-500/20 to-pink-600/10',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
    badge: 'bg-pink-500/20 text-pink-300',
    icon: 'text-pink-400',
  },
};

// Category labels
export const CATEGORY_LABELS: Record<PromptTemplateCategory, string> = {
  storywriting: 'Storywriting',
  research: 'Research',
  code_generation: 'Code Gen',
  analysis: 'Analysis',
  review: 'Review',
  custom: 'Custom',
};

interface TemplateCategoryColumnProps {
  category: PromptTemplateCategory;
  templates: PromptTemplate[];
  selectedTemplateId: string | null;
  onSelect: (template: PromptTemplate) => void;
  onGenerate: (template: PromptTemplate) => void;
  onDelete: (templateId: string) => void;
}

export function TemplateCategoryColumn({
  category,
  templates,
  selectedTemplateId,
  onSelect,
  onGenerate,
  onDelete,
}: TemplateCategoryColumnProps) {
  const theme = CATEGORY_THEMES[category];
  const label = CATEGORY_LABELS[category];

  // Convert templates to CompactListItem format
  const items: CompactListItem[] = useMemo(() => {
    return templates.map((template) => {
      const varCount = template.variables?.length || 0;
      const badges: CompactListItem['badges'] = [];

      // Add variable count badge
      if (varCount > 0) {
        badges.push({
          label: `${varCount}`,
          color: theme.icon,
        });
      }

      return {
        id: template.id,
        title: template.name,
        status: selectedTemplateId === template.id ? 'accepted' : 'pending',
        badges,
      };
    });
  }, [templates, selectedTemplateId, theme.icon]);

  // Handle item click - select template
  const handleItemClick = (item: CompactListItem) => {
    const template = templates.find((t) => t.id === item.id);
    if (template) {
      onSelect(template);
    }
  };

  // Handle delete
  const handleDelete = (itemId: string) => {
    onDelete(itemId);
  };

  return (
    <div className="flex flex-col h-full">
      <CompactList
        title={label}
        items={items}
        onItemClick={handleItemClick}
        onItemDelete={handleDelete}
        emptyMessage="No templates"
        maxHeight="max-h-[280px]"
      />
    </div>
  );
}
