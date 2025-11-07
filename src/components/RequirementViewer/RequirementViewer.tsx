'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader2, Edit2, Save, X, AlertCircle } from 'lucide-react';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import { readRequirement, updateRequirement } from '@/app/Claude/lib/requirementApi';

interface RequirementViewerProps {
  projectPath: string;
  requirementName: string;
  onContentChange?: (content: string) => void;
  allowEdit?: boolean;
  className?: string;
}

// Helper component for action buttons
interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant: 'cancel' | 'save' | 'edit';
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
}

function ActionButton({ onClick, disabled, variant, icon, label, loading }: ActionButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'cancel':
        return 'px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50';
      case 'save':
        return 'px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5';
      case 'edit':
        return 'px-3 py-1.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5';
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={getVariantClasses()}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}

export default function RequirementViewer({
  projectPath,
  requirementName,
  onContentChange,
  allowEdit = false,
  className = '',
}: RequirementViewerProps) {
  const [content, setContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadRequirementContent();
  }, [requirementName, projectPath]);

  const loadRequirementContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const requirementContent = await readRequirement(projectPath, requirementName);
      setContent(requirementContent);
      setEditedContent(requirementContent);
      if (onContentChange) {
        onContentChange(requirementContent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requirement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updateRequirement(projectPath, requirementName, editedContent);
      setContent(editedContent);
      setIsEditing(false);
      if (onContentChange) {
        onContentChange(editedContent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save requirement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading requirement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-white truncate">/{requirementName}</h3>
            <p className="text-sm text-gray-400">Claude Code Requirement</p>
          </div>
        </div>

        {/* Edit/Save Controls */}
        {allowEdit && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <ActionButton
                  onClick={handleCancel}
                  disabled={isSaving}
                  variant="cancel"
                  icon={<X className="w-4 h-4" />}
                  label=""
                />
                <ActionButton
                  onClick={handleSave}
                  disabled={isSaving || editedContent === content}
                  variant="save"
                  icon={isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  label={isSaving ? 'Saving...' : 'Save'}
                />
              </>
            ) : (
              <ActionButton
                onClick={() => setIsEditing(true)}
                variant="edit"
                icon={<Edit2 className="w-3.5 h-3.5" />}
                label="Edit"
              />
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Content - View or Edit Mode */}
      <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 max-h-[60vh] overflow-y-auto">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full min-h-[400px] p-6 bg-transparent text-gray-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-lg"
            placeholder="Enter requirement content in Markdown format..."
          />
        ) : (
          <div className="p-6">
            <MarkdownViewer content={content} />
          </div>
        )}
      </div>

      {/* Edit Mode Help Text */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-500 flex items-center gap-2"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Use Markdown syntax for formatting. Changes will update the requirement file.</span>
        </motion.div>
      )}
    </div>
  );
}
