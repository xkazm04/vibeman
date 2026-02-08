'use client';
import React, { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { AlertCircle, X } from 'lucide-react';
import { DbIdea } from '@/app/db';
import { generateRequirementForGoal } from '@/app/Claude/lib/requirementApi';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useAIOperation } from '@/hooks/useAIOperation';
import { useInvalidateIdeas } from '@/lib/queries/ideaQueries';
import { getStatusTextClass } from '@/lib/design-tokens/useEntityStyling';
import type { StatusType } from '@/lib/design-tokens/colors';
import IdeaDetailHeader from './IdeaDetailHeader';
import IdeaDetailContent from './IdeaDetailContent';
import IdeaDetailActions from './IdeaDetailActions';

interface IdeaDetailModalProps {
  idea: DbIdea;
  onClose: () => void;
  onUpdate: (updatedIdea: DbIdea) => void;
  onDelete: (ideaId: string) => void;
}

export default function IdeaDetailModal({ idea, onClose, onUpdate, onDelete }: IdeaDetailModalProps) {
  const [userFeedback, setUserFeedback] = useState(idea.user_feedback || '');
  const [userPattern, setUserPattern] = useState(idea.user_pattern === 1);
  const [description, setDescription] = useState(idea.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAIError, setShowAIError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { projects, initializeProjects } = useProjectConfigStore();
  const invalidateIdeas = useInvalidateIdeas();

  // Generate unique IDs for ARIA attributes
  const uniqueId = useId();
  const modalTitleId = `idea-detail-modal-title-${uniqueId}`;
  const modalDescriptionId = `idea-detail-modal-desc-${uniqueId}`;

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { execute: executeRequirementGen, retry: retryRequirementGen, error: requirementError } = useAIOperation({
    onSuccess: () => {
      setShowAIError(false);
    },
    onError: () => {
      setShowAIError(true);
    },
  });

  // Ensure projects are loaded
  useEffect(() => {
    if (projects.length === 0) {
      initializeProjects();
    }
  }, [projects.length, initializeProjects]);

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      functionality: '⚡',
      performance: '📊',
      maintenance: '🔧',
      ui: '🎨',
      code_quality: '💻',
      user_benefit: '❤️',
    };
    return emojis[category] || '💡';
  };

  // Use design token system for status colors
  const getStatusColor = (status: string) => {
    return getStatusTextClass((status || 'pending') as StatusType);
  };

  const updateIdea = async (updates: Partial<DbIdea>): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: idea.id,
          ...updates
        })
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate(data.idea);
        // Invalidate React Query cache to keep BufferView in sync
        invalidateIdeas();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to update idea');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error - please try again');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    setError(null);
    // 1. Update idea status to accepted
    const success = await updateIdea({ status: 'accepted' });
    if (!success) return; // Error already set by updateIdea

    // 2. If idea has goal_id, generate requirement file for that goal
    if (idea.goal_id) {
      const project = projects.find(p => p.id === idea.project_id);
      if (project) {
        await executeRequirementGen(async () => {
          await generateRequirementForGoal(project.path, idea.project_id, idea.goal_id!);
          return { success: true };
        });
      }
    }
  };

  const handleReject = async () => {
    try {
      setSaving(true);
      setError(null);
      const project = projects.find(p => p.id === idea.project_id);

      if (project) {
        // Use the tinder reject endpoint which handles requirement deletion
        const response = await fetch('/api/ideas/tinder/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ideaId: idea.id,
            projectPath: project.path,
          }),
        });

        if (response.ok) {
          // Update local state
          await updateIdea({ status: 'rejected', requirement_id: null });
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || 'Failed to reject idea');
        }
      } else {
        // Fallback if project not found
        await updateIdea({ status: 'rejected' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error - please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeedback = async () => {
    await updateIdea({
      user_feedback: userFeedback,
      user_pattern: userPattern ? 1 : 0
    });
  };

  const handleSaveDescription = async () => {
    await updateIdea({
      description: description
    });
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setDescription(idea.description || '');
    setIsEditingDescription(false);
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      setError(null);

      // Delete requirement file if it exists
      if (idea.requirement_id) {
        const project = projects.find(p => p.id === idea.project_id);
        if (project?.path) {
          try {
            await fetch('/api/claude-code/requirement', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath: project.path,
                requirementName: idea.requirement_id,
              }),
            });
            // Ignore delete errors - idea will still be deleted from DB
          } catch {
            // Ignore file deletion errors
          }
        }
      }

      // Delete the idea from database
      const response = await fetch(`/api/ideas?id=${encodeURIComponent(idea.id)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onDelete(idea.id);
        // Invalidate React Query cache to keep BufferView in sync
        invalidateIdeas();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to delete idea');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error - please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setSaving(true);
      setError(null);

      // 1. If requirement_id exists, delete it from DB and file system
      if (idea.requirement_id) {
        const project = projects.find(p => p.id === idea.project_id);

        if (project?.path) {
          // Delete requirement file
          try {
            await fetch('/api/claude-code/requirement', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath: project.path,
                requirementName: idea.requirement_id,
              }),
            });
            // Ignore delete errors
          } catch {
            // Ignore file deletion errors
          }

          // Remove requirement_id from idea in DB
          const cleared = await updateIdea({ requirement_id: null });
          if (!cleared) return; // Error already set
        }
      }

      // 2. Generate new requirement using /api/ideas/tinder/accept
      //    This uses the unified builder and handles goal/context lookups
      const project = projects.find(p => p.id === idea.project_id);
      if (project) {
        const acceptResponse = await fetch('/api/ideas/tinder/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ideaId: idea.id,
            projectPath: project.path,
          }),
        });

        if (acceptResponse.ok) {
          const acceptData = await acceptResponse.json();
          // Update local idea state with new requirement_id
          await updateIdea({ requirement_id: acceptData.requirementName });
        } else {
          const errorData = await acceptResponse.json().catch(() => ({}));
          setError(errorData.error || 'Failed to regenerate requirement');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error - please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FocusTrap
      focusTrapOptions={{
        allowOutsideClick: true,
        escapeDeactivates: true,
        fallbackFocus: '[data-testid="idea-detail-modal"]',
      }}
    >
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        data-testid="idea-detail-modal-backdrop"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
        />

        {/* Modal Container */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          aria-describedby={modalDescriptionId}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 flex flex-col"
          onClick={(e) => e.stopPropagation()}
          data-testid="idea-detail-modal"
        >
          {/* Header */}
          <IdeaDetailHeader
            idea={idea}
            onClose={onClose}
            getCategoryEmoji={getCategoryEmoji}
            getStatusColor={getStatusColor}
            titleId={modalTitleId}
          />

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-4 mt-2"
              >
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 flex-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable Content */}
          <IdeaDetailContent
            idea={idea}
            userFeedback={userFeedback}
            setUserFeedback={setUserFeedback}
            userPattern={userPattern}
            setUserPattern={setUserPattern}
            description={description}
            setDescription={setDescription}
            isEditingDescription={isEditingDescription}
            setIsEditingDescription={setIsEditingDescription}
            handleSaveDescription={handleSaveDescription}
            handleCancelDescription={handleCancelDescription}
            saving={saving}
            requirementError={requirementError}
            retryRequirementGen={retryRequirementGen}
            showAIError={showAIError}
            setShowAIError={setShowAIError}
            onUpdate={updateIdea}
            descriptionId={modalDescriptionId}
          />

          {/* Footer Actions */}
          <IdeaDetailActions
            idea={idea}
            saving={saving}
            onAccept={handleAccept}
            onReject={handleReject}
            onDelete={handleDelete}
            onSaveFeedback={handleSaveFeedback}
            onRegenerate={handleRegenerate}
          />
        </motion.div>
      </div>
    </FocusTrap>
  );
}
