'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { GradientButton } from '@/components/ui';
import IdeaCard from './IdeaCard';
import ActionButtons from './ActionButtons';
import { TINDER_CONSTANTS, TINDER_ANIMATIONS } from '../lib/tinderUtils';

interface TinderContentProps {
  ideas: DbIdea[];
  currentIndex: number;
  currentIdea: DbIdea | undefined;
  loading: boolean;
  processing: boolean;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onDelete: () => Promise<void>;
  onStartOver: () => void;
}

export default function TinderContent({
  ideas,
  currentIndex,
  currentIdea,
  loading,
  processing,
  onAccept,
  onReject,
  onDelete,
  onStartOver,
}: TinderContentProps) {
  const { getProject } = useProjectConfigStore();

  if (loading && currentIndex === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center justify-center h-[600px]">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
          <p className="text-gray-400">Loading ideas...</p>
        </div>
      </div>
    );
  }

  if (!currentIdea) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center justify-center h-[600px]">
          <Sparkles className="w-16 h-16 text-purple-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">All Done!</h2>
          <p className="text-gray-400 mb-6">
            You&apos;ve reviewed all pending ideas
          </p>
          <GradientButton
            onClick={onStartOver}
            colorScheme="pink"
            size="lg"
            animate={true}
          >
            Start Over
          </GradientButton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Card Stack */}
      <div className="relative h-[600px] mb-8">
        <AnimatePresence>
          {ideas.slice(currentIndex, currentIndex + TINDER_CONSTANTS.PREVIEW_CARDS).map((idea, index) => {
            const projectName = getProject(idea.project_id)?.name || 'Unknown Project';

            return (
              <IdeaCard
                key={idea.id}
                idea={idea}
                projectName={projectName}
                onSwipeLeft={index === 0 ? onReject : () => {}}
                onSwipeRight={index === 0 ? onAccept : () => {}}
                style={{
                  zIndex: 10 - index,
                  ...TINDER_ANIMATIONS.CARD_STACK_TRANSFORM(index),
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <ActionButtons
        onReject={onReject}
        onDelete={onDelete}
        onAccept={onAccept}
        disabled={processing}
      />

      {/* Loading indicator for next batch */}
      {loading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">Loading more ideas...</p>
        </div>
      )}
    </div>
  );
}