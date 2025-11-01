'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { generateRequirementForGoal } from '@/app/Claude/lib/requirementApi';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useAIOperation } from '@/hooks/useAIOperation';
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

  const { projects, initializeProjects } = useProjectConfigStore();

  const { execute: executeRequirementGen, retry: retryRequirementGen, error: requirementError } = useAIOperation({
    onSuccess: () => {
      console.log('Requirement generation completed successfully');
      setShowAIError(false);
    },
    onError: (err) => {
      console.error('Failed to generate requirement:', err);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'implemented': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  const updateIdea = async (updates: Partial<DbIdea>) => {
    try {
      setSaving(true);
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
      }
    } catch (error) {
      console.error('Error updating idea:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    try {
      // 1. Update idea status to accepted
      await updateIdea({ status: 'accepted' });
      console.log('[IdeaDetailModal] Idea accepted');

      // 2. If idea has goal_id, generate requirement file for that goal
      if (idea.goal_id) {
        const project = projects.find(p => p.id === idea.project_id);
        if (project) {
          console.log('[IdeaDetailModal] Generating requirement for goal:', idea.goal_id);
          await executeRequirementGen(async () => {
            await generateRequirementForGoal(project.path, idea.project_id, idea.goal_id!);
            return { success: true };
          });
        }
      } else {
        console.log('[IdeaDetailModal] No goal associated with this idea, requirement will be created via Tinder UI');
      }
    } catch (error) {
      console.error('[IdeaDetailModal] Error accepting idea:', error);
    }
  };

  const handleReject = async () => {
    try {
      setSaving(true);
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
          console.log('[IdeaDetailModal] Idea rejected successfully');
          // Update local state
          await updateIdea({ status: 'rejected', requirement_id: null });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to reject idea');
        }
      } else {
        // Fallback if project not found
        await updateIdea({ status: 'rejected' });
      }
    } catch (error) {
      console.error('[IdeaDetailModal] Error rejecting idea:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeedback = async () => {
    await updateIdea({
      user_feedback: userFeedback,
      user_pattern: userPattern
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
      
      // Delete requirement file if it exists
      if (idea.requirement_id) {
        const project = projects.find(p => p.id === idea.project_id);
        if (project?.path) {
          console.log('[IdeaDetailModal] Deleting requirement file:', idea.requirement_id);
          try {
            const deleteResponse = await fetch('/api/claude-code/requirement', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath: project.path,
                requirementName: idea.requirement_id,
              }),
            });

            if (deleteResponse.ok) {
              console.log('[IdeaDetailModal] Requirement file deleted successfully');
            } else {
              console.log('[IdeaDetailModal] Requirement file not found (non-critical)');
            }
          } catch (deleteError) {
            console.log('[IdeaDetailModal] Error deleting requirement file (non-critical):', deleteError);
          }
        }
      }

      // Delete the idea from database
      const response = await fetch(`/api/ideas?id=${encodeURIComponent(idea.id)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onDelete(idea.id);
      }
    } catch (error) {
      console.error('Error deleting idea:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setSaving(true);

      // 1. If requirement_id exists, delete it from DB and file system
      if (idea.requirement_id) {
        const project = projects.find(p => p.id === idea.project_id);

        if (project?.path) {
          console.log('[IdeaDetailModal] Removing existing requirement:', idea.requirement_id);

          // Delete requirement file
          try {
            const deleteResponse = await fetch('/api/claude-code/requirement', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath: project.path,
                requirementName: idea.requirement_id,
              }),
            });

            if (deleteResponse.ok) {
              console.log('[IdeaDetailModal] Requirement file deleted successfully');
            } else {
              console.log('[IdeaDetailModal] Requirement file not found on disk, continuing...');
            }
          } catch (deleteError) {
            console.log('[IdeaDetailModal] Error deleting requirement file (non-critical):', deleteError);
          }

          // Remove requirement_id from idea in DB
          await updateIdea({ requirement_id: null });
        }
      }

      // 2. Generate new requirement using /api/ideas/tinder/accept
      //    This uses the unified builder and handles goal/context lookups
      const project = projects.find(p => p.id === idea.project_id);
      if (project) {
        try {
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
            console.log('[IdeaDetailModal] Requirement regenerated successfully:', acceptData.requirementName);
            // Update local idea state with new requirement_id
            await updateIdea({ requirement_id: acceptData.requirementName });
          } else {
            const errorData = await acceptResponse.json();
            throw new Error(errorData.error || 'Failed to regenerate requirement');
          }
        } catch (regenerateError) {
          console.error('[IdeaDetailModal] Error regenerating requirement:', regenerateError);
          throw regenerateError;
        }
      }
    } catch (error) {
      console.error('[IdeaDetailModal] Error in handleRegenerate:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <IdeaDetailHeader
          idea={idea}
          onClose={onClose}
          getCategoryEmoji={getCategoryEmoji}
          getStatusColor={getStatusColor}
        />

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
  );
}
