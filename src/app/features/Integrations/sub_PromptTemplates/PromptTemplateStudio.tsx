'use client';

/**
 * Prompt Template Studio - Redesigned
 * Multi-column layout with CompactList per category
 * Inline editing panel (no modals)
 * LLM integration for review and AI randomization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Check } from 'lucide-react';
import type { PromptTemplateCategory } from '@/app/db/models/types';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import {
  TemplateCategoryColumn,
  type PromptTemplate,
} from './components/TemplateCategoryColumn';
import { TemplateDetailPanel } from './components/TemplateDetailPanel';

// All categories in display order
const ALL_CATEGORIES: PromptTemplateCategory[] = [
  'storywriting',
  'research',
  'code_generation',
  'analysis',
  'review',
  'custom',
];

interface PromptTemplateStudioProps {
  projectId: string;
}

export function PromptTemplateStudio({ projectId }: PromptTemplateStudioProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { activeProject } = useActiveProjectStore();
  const projectPath = activeProject?.path || '';

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/prompt-templates?projectId=${projectId}`);
      const data = await response.json();

      if (response.ok) {
        // Parse variables for each template
        const parsed = data.map((t: PromptTemplate & { variables?: string }) => ({
          ...t,
          variables: typeof t.variables === 'string' ? JSON.parse(t.variables || '[]') : (t.variables || []),
        }));
        setTemplates(parsed);
      } else {
        setError(data.error || 'Failed to load templates');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<PromptTemplateCategory, PromptTemplate[]> = {
      storywriting: [],
      research: [],
      code_generation: [],
      analysis: [],
      review: [],
      custom: [],
    };

    for (const template of templates) {
      if (grouped[template.category]) {
        grouped[template.category].push(template);
      }
    }

    return grouped;
  }, [templates]);

  // Handlers
  const handleSelectTemplate = (template: PromptTemplate) => {
    setIsCreating(false);
    setSelectedTemplate(template);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setIsCreating(true);
  };

  const handleClosePanel = () => {
    setSelectedTemplate(null);
    setIsCreating(false);
  };

  const handleSaveTemplate = (savedTemplate: PromptTemplate) => {
    fetchTemplates();
    setSelectedTemplate(savedTemplate);
    setIsCreating(false);
    setSuccessMessage('Template saved');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompt-templates?id=${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTemplates();
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
        setSuccessMessage('Template deleted');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      setError('Failed to delete template');
    }
  };

  const handleGenerateFromTemplate = (template: PromptTemplate) => {
    setIsCreating(false);
    setSelectedTemplate(template);
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-28 right-6 z-50 px-4 py-3 bg-green-600/20 border border-green-500/30 rounded-lg text-green-400 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Prompt Templates
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Create reusable templates for storywriting, research, and more
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Multi-Column Layout */}
      <div className="grid grid-cols-6 gap-4">
        {ALL_CATEGORIES.map((category) => (
          <TemplateCategoryColumn
            key={category}
            category={category}
            templates={templatesByCategory[category]}
            selectedTemplateId={selectedTemplate?.id || null}
            onSelect={handleSelectTemplate}
            onGenerate={handleGenerateFromTemplate}
            onDelete={handleDeleteTemplate}
          />
        ))}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {(selectedTemplate || isCreating) && (
          <TemplateDetailPanel
            template={selectedTemplate}
            isNew={isCreating}
            projectId={projectId}
            projectPath={projectPath}
            onClose={handleClosePanel}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
          />
        )}
      </AnimatePresence>

      {/* Empty State (no templates at all) */}
      {templates.length === 0 && !loading && !isCreating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-64 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No templates yet</h3>
          <p className="text-gray-500 max-w-md mb-4">
            Create your first template to get started with reusable prompts
          </p>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </motion.div>
      )}
    </div>
  );
}
