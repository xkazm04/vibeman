'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Save,
  Send,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  FileCode,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { useMarketplaceStore, PatternFormData } from '@/stores/marketplaceStore';
import type { PatternCategory, PatternScope } from '@/app/db/models/marketplace.types';

const categories: { value: PatternCategory; label: string; description: string }[] = [
  { value: 'migration', label: 'Migration', description: 'Upgrade dependencies or migrate to new APIs' },
  { value: 'cleanup', label: 'Cleanup', description: 'Remove dead code, simplify logic' },
  { value: 'security', label: 'Security', description: 'Fix vulnerabilities and security issues' },
  { value: 'performance', label: 'Performance', description: 'Optimize speed and resource usage' },
  { value: 'architecture', label: 'Architecture', description: 'Improve code structure and patterns' },
  { value: 'testing', label: 'Testing', description: 'Add or improve test coverage' },
  { value: 'modernization', label: 'Modernization', description: 'Update to modern patterns' },
  { value: 'best-practices', label: 'Best Practices', description: 'Follow coding standards' },
];

const scopes: { value: PatternScope; label: string; description: string }[] = [
  { value: 'file', label: 'File', description: 'Single file changes' },
  { value: 'module', label: 'Module', description: 'Multiple related files' },
  { value: 'project', label: 'Project', description: 'Project-wide changes' },
  { value: 'framework', label: 'Framework', description: 'Framework-specific patterns' },
];

export default function CreatePatternView() {
  const {
    formData,
    formErrors,
    setFormData,
    clearFormData,
    validateForm,
    createPattern,
    isPublishing,
    setCurrentView,
  } = useMarketplaceStore();

  const [tagInput, setTagInput] = useState('');
  const [step, setStep] = useState(1);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({ tags: [...(formData.tags || []), tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ tags: (formData.tags || []).filter((t) => t !== tag) });
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!validateForm()) return;

    setSaveAsDraft(asDraft);
    const pattern = await createPattern({
      ...formData,
      status: asDraft ? 'draft' : 'published',
    } as PatternFormData);

    if (pattern) {
      clearFormData();
      setCurrentView('my-patterns');
    }
  };

  const goToStep = (newStep: number) => {
    if (newStep < step || validateStepFields(step)) {
      setStep(newStep);
    }
  };

  const validateStepFields = (currentStep: number): boolean => {
    if (currentStep === 1) {
      return !!(formData.name && formData.title && formData.category && formData.scope);
    }
    if (currentStep === 2) {
      return !!(formData.problem_statement && formData.solution_approach);
    }
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('browse')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          data-testid="create-pattern-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-purple-400" />
          Create Pattern
        </h1>

        <div className="w-20" /> {/* Spacer */}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => goToStep(s)}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
              s === step
                ? 'bg-purple-500 text-white'
                : s < step
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/5 text-gray-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-black/30 border border-white/5 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-medium text-white">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Pattern Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., react-class-to-hooks"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50"
                  data-testid="pattern-name-input"
                />
                {formErrors.name && (
                  <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., Convert React Class Components to Hooks"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50"
                  data-testid="pattern-title-input"
                />
                {formErrors.title && (
                  <p className="text-xs text-red-400 mt-1">{formErrors.title}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Briefly describe what this pattern does..."
                rows={3}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50 resize-none"
                data-testid="pattern-description-input"
              />
              {formErrors.description && (
                <p className="text-xs text-red-400 mt-1">{formErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500/50"
                  data-testid="pattern-category-select"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Scope <span className="text-red-400">*</span>
                </label>
                <select
                  name="scope"
                  value={formData.scope || ''}
                  onChange={handleInputChange}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500/50"
                  data-testid="pattern-scope-select"
                >
                  <option value="">Select scope</option>
                  {scopes.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label} - {scope.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add a tag..."
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-600 outline-none focus:border-purple-500/50"
                  data-testid="pattern-tag-input"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  <Tag className="w-4 h-4" />
                </button>
              </div>
              {(formData.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-white/5 text-gray-300 rounded-full flex items-center gap-1"
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => goToStep(2)}
              disabled={!validateStepFields(1)}
              className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="create-pattern-next-1"
            >
              Next: Problem & Solution
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Problem & Solution */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-black/30 border border-white/5 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-medium text-white">Problem & Solution</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                <AlertTriangle className="inline w-4 h-4 mr-1 text-orange-400" />
                Problem Statement <span className="text-red-400">*</span>
              </label>
              <textarea
                name="problem_statement"
                value={formData.problem_statement || ''}
                onChange={handleInputChange}
                placeholder="What problem does this pattern solve? Why is the current code problematic?"
                rows={4}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50 resize-none"
                data-testid="pattern-problem-input"
              />
              {formErrors.problem_statement && (
                <p className="text-xs text-red-400 mt-1">{formErrors.problem_statement}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                <Sparkles className="inline w-4 h-4 mr-1 text-green-400" />
                Solution Approach <span className="text-red-400">*</span>
              </label>
              <textarea
                name="solution_approach"
                value={formData.solution_approach || ''}
                onChange={handleInputChange}
                placeholder="How does this pattern solve the problem? What transformation does it apply?"
                rows={4}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50 resize-none"
                data-testid="pattern-solution-input"
              />
              {formErrors.solution_approach && (
                <p className="text-xs text-red-400 mt-1">{formErrors.solution_approach}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Detailed Description (Markdown)</label>
              <textarea
                name="detailed_description"
                value={formData.detailed_description || ''}
                onChange={handleInputChange}
                placeholder="Optional: Provide a detailed explanation with examples..."
                rows={6}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50 resize-none font-mono text-sm"
                data-testid="pattern-detailed-input"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => goToStep(1)}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              data-testid="create-pattern-back-2"
            >
              Back
            </button>
            <button
              onClick={() => goToStep(3)}
              disabled={!validateStepFields(2)}
              className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="create-pattern-next-2"
            >
              Next: Examples & Settings
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Examples & Settings */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-black/30 border border-white/5 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-purple-400" />
              Code Examples
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-red-400 mb-2">Before (Original Code)</label>
                <textarea
                  name="example_before"
                  value={formData.example_before || ''}
                  onChange={handleInputChange}
                  placeholder="// Original code that needs refactoring"
                  rows={8}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50 resize-none font-mono text-sm"
                  data-testid="pattern-example-before"
                />
              </div>

              <div>
                <label className="block text-sm text-green-400 mb-2">After (Refactored Code)</label>
                <textarea
                  name="example_after"
                  value={formData.example_after || ''}
                  onChange={handleInputChange}
                  placeholder="// Refactored code after applying pattern"
                  rows={8}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50 resize-none font-mono text-sm"
                  data-testid="pattern-example-after"
                />
              </div>
            </div>
          </div>

          <div className="bg-black/30 border border-white/5 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-medium text-white">Settings & Metadata</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Estimated Effort</label>
                <select
                  name="estimated_effort"
                  value={formData.estimated_effort || 'medium'}
                  onChange={handleInputChange}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500/50"
                  data-testid="pattern-effort-select"
                >
                  <option value="low">Low (Quick fix)</option>
                  <option value="medium">Medium (Some work)</option>
                  <option value="high">High (Significant effort)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Risk Level</label>
                <select
                  name="risk_level"
                  value={formData.risk_level || 'low'}
                  onChange={handleInputChange}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500/50"
                  data-testid="pattern-risk-select"
                >
                  <option value="low">Low (Safe changes)</option>
                  <option value="medium">Medium (Test carefully)</option>
                  <option value="high">High (Breaking changes)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Language</label>
                <input
                  type="text"
                  name="language"
                  value={formData.language || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., typescript"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50"
                  data-testid="pattern-language-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Framework (Optional)</label>
                <input
                  type="text"
                  name="framework"
                  value={formData.framework || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., react, nextjs, express"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50"
                  data-testid="pattern-framework-input"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Version (Optional)</label>
                <input
                  type="text"
                  name="min_version"
                  value={formData.min_version || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 18.0.0"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-purple-500/50"
                  data-testid="pattern-version-input"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_review ?? true}
                  onChange={(e) => setFormData({ requires_review: e.target.checked })}
                  className="w-4 h-4 accent-purple-500"
                  data-testid="pattern-requires-review"
                />
                <span className="text-sm text-gray-300">Requires manual review after application</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.automated ?? false}
                  onChange={(e) => setFormData({ automated: e.target.checked })}
                  className="w-4 h-4 accent-purple-500"
                  data-testid="pattern-automated"
                />
                <span className="text-sm text-gray-300">Can be fully automated</span>
              </label>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => goToStep(2)}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              data-testid="create-pattern-back-3"
            >
              Back
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit(true)}
                disabled={isPublishing}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                data-testid="create-pattern-save-draft"
              >
                {isPublishing && saveAsDraft ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save as Draft
              </button>

              <button
                onClick={() => handleSubmit(false)}
                disabled={isPublishing}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                data-testid="create-pattern-publish"
              >
                {isPublishing && !saveAsDraft ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Publish Pattern
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
