'use client';

/**
 * TemplateDetailPanel - Redesigned
 * Inline editing panel for templates
 * Features:
 * - Markdown editor (replaces split editor/preview)
 * - System variables with context dropdown
 * - Custom variables section
 * - Darker theme with no focus outlines
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit3,
  Save,
  Play,
  ChevronDown,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import type { PromptTemplateCategory, PromptTemplateVariable } from '@/app/db/models/types';
import { TemplateVariableEditor } from './TemplateVariableEditor';
import { SystemVariableSelector } from './SystemVariableSelector';
import { LLMReviewPanel } from './LLMReviewPanel';
import { MarkdownEditor } from './MarkdownEditor';
import { GeneratorPanel } from './GeneratorPanel';
import { CATEGORY_THEMES, CATEGORY_LABELS, type PromptTemplate } from './TemplateCategoryColumn';

// Shared input class (no focus outline)
const inputClass = 'w-full px-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-purple-500/50 transition-colors';
const selectClass = 'w-full px-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-0 focus:border-purple-500/50 transition-colors cursor-pointer';

// All categories
const CATEGORIES: PromptTemplateCategory[] = [
  'storywriting',
  'research',
  'code_generation',
  'analysis',
  'review',
  'custom',
];

interface TemplateDetailPanelProps {
  template: PromptTemplate | null;
  isNew: boolean;
  projectId: string;
  projectPath: string;
  onClose: () => void;
  onSave: (template: PromptTemplate) => void;
  onDelete?: (templateId: string) => void;
}

export function TemplateDetailPanel({
  template,
  isNew,
  projectId,
  projectPath,
  onClose,
  onSave,
  onDelete,
}: TemplateDetailPanelProps) {
  // Tab state
  type DetailTab = 'template' | 'generator';
  const [activeTab, setActiveTab] = useState<DetailTab>('template');

  // Form state
  const [isEditing, setIsEditing] = useState(isNew);
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState<PromptTemplateCategory>(template?.category || 'custom');
  const [templateContent, setTemplateContent] = useState(template?.template_content || '');
  const [variables, setVariables] = useState<PromptTemplateVariable[]>(template?.variables || []);
  const [systemVariables, setSystemVariables] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  // Sync form state when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setCategory(template.category);
      setTemplateContent(template.template_content);
      setVariables(template.variables || []);
      // Check for system variables in content
      if (template.template_content.includes('${contextSection}')) {
        setSystemVariables({ contextSection: '' });
      } else {
        setSystemVariables({});
      }
    } else {
      // Reset for new template
      setName('');
      setDescription('');
      setCategory('custom');
      setTemplateContent('');
      setVariables([]);
      setSystemVariables({});
    }
    setIsEditing(isNew);
    setActiveTab('template');
    setError(null);
    setSuccess(null);
  }, [template, isNew]);

  // Darker gradient based on category
  const theme = CATEGORY_THEMES[category];
  const darkGradient = 'from-gray-900/95 via-gray-900/90 to-gray-950/95';

  // Handle save
  const handleSave = async () => {
    if (!name.trim() || !templateContent.trim()) {
      setError('Name and content are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        projectId,
        name: name.trim(),
        description: description.trim() || null,
        category,
        templateContent: templateContent.trim(),
        variables,
        ...(template?.id && { id: template.id }),
      };

      const response = await fetch('/api/prompt-templates', {
        method: template ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Template saved');
        setIsEditing(false);
        onSave(data);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl bg-gradient-to-br ${darkGradient} border ${theme.border} overflow-hidden shadow-2xl`}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-800/80 bg-gray-950/50"
      >
        <div className="flex items-center gap-3">
          <h3 className={`font-semibold ${theme.text}`}>
            {isNew ? 'New Template' : template?.name}
          </h3>
          {!isNew && (
            <span className={`text-xs px-2 py-0.5 rounded ${theme.badge}`}>
              {CATEGORY_LABELS[category]}
            </span>
          )}
          {/* Tab navigation - visible only when viewing a saved template */}
          {!isNew && !isEditing && (
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => setActiveTab('template')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'template'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <FileText className="w-3 h-3" />
                Template
              </button>
              <button
                onClick={() => setActiveTab('generator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'generator'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Play className="w-3 h-3" />
                Generator
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && !isEditing && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setIsEditing(true); setActiveTab('template'); }}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-800/60 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </motion.button>
          )}
          {isEditing && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowReview(!showReview)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              LLM Review
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-4 py-2 text-sm flex items-center gap-2 ${
              error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
            }`}
          >
            {error ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {error || success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LLM Review Panel */}
      <AnimatePresence>
        {showReview && isEditing && (
          <LLMReviewPanel
            templateContent={templateContent}
            category={category}
            onApply={(improved) => setTemplateContent(improved)}
            onClose={() => setShowReview(false)}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Name & Category Row */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-3 gap-3"
            >
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PromptTemplateCategory)}
                    className={selectClass}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Mode: Description */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this template do?"
                className={inputClass}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Mode: Markdown Editor */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">Template Content</label>
              <span className="text-xs text-gray-500">
                Use {'{{VAR}}'} for custom, {'${var}'} for system variables
              </span>
            </div>
            <MarkdownEditor
              value={templateContent}
              onChange={setTemplateContent}
              placeholder="Write your template here using Markdown..."
              height={250}
              previewMode="live"
            />
          </motion.div>
        )}

        {/* Edit Mode: Variables Section */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="border-t border-gray-800/80 pt-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <TemplateVariableEditor
                  variables={variables}
                  templateContent={templateContent}
                  onChange={setVariables}
                  disabled={false}
                />
              </div>
              <div>
                <SystemVariableSelector
                  projectId={projectId}
                  selectedVariables={systemVariables}
                  onChange={setSystemVariables}
                  disabled={false}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Edit Mode: Save Button */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-end gap-2 border-t border-gray-800/80 pt-4"
            >
              {!isNew && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving || !name.trim() || !templateContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isNew ? 'Create Template' : 'Save Changes'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Mode: Template Tab */}
        {!isEditing && activeTab === 'template' && (
          <motion.div
            key="template-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {template?.description && (
              <p className="text-sm text-gray-400">{template.description}</p>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Template</label>
              <div className="min-h-[200px] px-3 py-2 bg-gray-900/60 border border-gray-700/30 rounded-lg overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {templateContent}
                </pre>
              </div>
            </div>
            <div className="border-t border-gray-800/80 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <TemplateVariableEditor
                    variables={variables}
                    templateContent={templateContent}
                    onChange={setVariables}
                    disabled={true}
                  />
                </div>
                <div>
                  <SystemVariableSelector
                    projectId={projectId}
                    selectedVariables={systemVariables}
                    onChange={setSystemVariables}
                    disabled={true}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* View Mode: Generator Tab */}
        {!isEditing && activeTab === 'generator' && template && (
          <motion.div
            key="generator-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <GeneratorPanel
              template={template}
              projectId={projectId}
              projectPath={projectPath}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
