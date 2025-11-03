'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save, Trash2, FileCode, AlertCircle } from 'lucide-react';
import { StructureRule } from '@/app/api/structure-scan/structureTemplates';
import RuleEditorRow from './RuleEditorRow';

interface StructureTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  projectType: 'nextjs' | 'fastapi';
}

export default function StructureTemplateEditor({
  isOpen,
  onClose,
  projectType,
}: StructureTemplateEditorProps) {
  const [rules, setRules] = useState<StructureRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load template on open
  useEffect(() => {
    if (isOpen) {
      loadTemplate();
    }
  }, [isOpen, projectType]);

  const loadTemplate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/structure-scan/templates?type=${projectType}`);
      const data = await response.json();

      if (data.success && data.rules) {
        setRules(data.rules);
      } else {
        setError(data.error || 'Failed to load template');
      }
    } catch (err) {
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/structure-scan/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          rules,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onClose();
      } else {
        setError(data.error || 'Failed to save template');
      }
    } catch (err) {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = () => {
    setRules([
      ...rules,
      {
        pattern: '',
        description: '',
        required: false,
        examples: [],
      },
    ]);
  };

  const handleUpdateRule = (index: number, updatedRule: StructureRule) => {
    const newRules = [...rules];
    newRules[index] = updatedRule;
    setRules(newRules);
  };

  const handleDeleteRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleResetToDefault = async () => {
    if (confirm('Are you sure you want to reset to default template? This cannot be undone.')) {
      try {
        const response = await fetch(`/api/structure-scan/templates?type=${projectType}&reset=true`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          loadTemplate(); // Reload default template
        } else {
          setError(data.error || 'Failed to reset template');
        }
      } catch (err) {
        setError('Failed to reset template');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-7xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <FileCode className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Structure Template Editor
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {projectType === 'nextjs' ? 'Next.js' : 'FastAPI'} Project Structure
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-400 text-sm">Loading template...</div>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule, index) => (
                  <RuleEditorRow
                    key={index}
                    rule={rule}
                    index={index}
                    onUpdate={(updatedRule) => handleUpdateRule(index, updatedRule)}
                    onDelete={() => handleDeleteRule(index)}
                  />
                ))}

                {/* Add Rule Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleAddRule}
                  className="w-full p-3 border-2 border-dashed border-gray-600/50 hover:border-cyan-500/50 rounded-lg text-gray-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Add New Rule</span>
                </motion.button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-800/50">
            <button
              onClick={handleResetToDefault}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset to Default
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Template</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
