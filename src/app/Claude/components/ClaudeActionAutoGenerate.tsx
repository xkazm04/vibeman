'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { generateRequirements } from '../lib/requirementApi';
import { AIErrorDisplay } from '@/components/ui';
import { useAIOperation } from '@/hooks/useAIOperation';

interface ClaudeActionAutoGenerateProps {
  projectPath: string;
  projectId: string;
  disabled?: boolean;
  onGenerateComplete?: () => void;
}

export default function ClaudeActionAutoGenerate({
  projectPath,
  projectId,
  disabled = false,
  onGenerateComplete,
}: ClaudeActionAutoGenerateProps) {
  const [showError, setShowError] = useState(false);

  const { execute, retry, isLoading: isGenerating, error } = useAIOperation({
    onSuccess: () => {
      onGenerateComplete?.();
      setShowError(false);
    },
    onError: () => {
      setShowError(true);
    },
  });

  const handleGenerateRequirements = async () => {
    if (!projectId) return;

    await execute(async () => {
      await generateRequirements(projectPath, projectId);
      return { success: true };
    });
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleGenerateRequirements}
        disabled={isGenerating || disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          isGenerating || disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg'
        }`}
        title="Generate requirements from goals and contexts"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            <span>Prepare requirements</span>
          </>
        )}
      </motion.button>

      {/* Error Display */}
      <AnimatePresence>
        {showError && error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-10"
          >
            <AIErrorDisplay
              error={error}
              onRetry={retry}
              onDismiss={() => setShowError(false)}
              compact
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
