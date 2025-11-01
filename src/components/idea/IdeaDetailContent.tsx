'use client';
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { AIErrorDisplay } from '@/components/ui';
import IdeaDetailMeta from './IdeaDetailMeta';
import IdeaDetailDescription from './IdeaDetailDescription';
import IdeaDetailFeedback from './IdeaDetailFeedback';

interface IdeaDetailContentProps {
  idea: DbIdea;
  userFeedback: string;
  setUserFeedback: (value: string) => void;
  userPattern: boolean;
  setUserPattern: (value: boolean) => void;
  description: string;
  setDescription: (value: string) => void;
  isEditingDescription: boolean;
  setIsEditingDescription: (value: boolean) => void;
  handleSaveDescription: () => void;
  handleCancelDescription: () => void;
  saving: boolean;
  requirementError: any;
  retryRequirementGen: () => void;
  showAIError: boolean;
  setShowAIError: (value: boolean) => void;
  onUpdate: (updates: Partial<DbIdea>) => Promise<void>;
}

export default function IdeaDetailContent({
  idea,
  userFeedback,
  setUserFeedback,
  userPattern,
  setUserPattern,
  description,
  setDescription,
  isEditingDescription,
  setIsEditingDescription,
  handleSaveDescription,
  handleCancelDescription,
  saving,
  requirementError,
  retryRequirementGen,
  showAIError,
  setShowAIError,
  onUpdate,
}: IdeaDetailContentProps) {

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* AI Error Display */}
      <AnimatePresence>
        {showAIError && requirementError && (
          <AIErrorDisplay
            error={requirementError}
            onRetry={retryRequirementGen}
            onDismiss={() => setShowAIError(false)}
            compact
          />
        )}
      </AnimatePresence>

      {/* Meta Info Section */}
      <IdeaDetailMeta idea={idea} onUpdate={onUpdate} />

      {/* Description */}
      <IdeaDetailDescription
        description={description}
        isEditing={isEditingDescription}
        saving={saving}
        onEdit={() => setIsEditingDescription(true)}
        onSave={handleSaveDescription}
        onCancel={handleCancelDescription}
        onChange={setDescription}
      />

      {/* Reasoning */}
      {idea.reasoning && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            LLM Reasoning
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed italic">
            {idea.reasoning}
          </p>
        </div>
      )}

      {/* User Feedback Section */}
      <IdeaDetailFeedback
        userFeedback={userFeedback}
        userPattern={userPattern}
        onFeedbackChange={setUserFeedback}
        onPatternChange={setUserPattern}
      />
    </div>
  );
}
