'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { generateRequirements } from '../lib/requirementApi';

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
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateRequirements = async () => {
    if (!projectId) return;

    setIsGenerating(true);
    try {
      await generateRequirements(projectPath, projectId);
      // Auto-refresh requirements list
      onGenerateComplete?.();
    } catch (err) {
      console.error(
        'Error generating requirements:',
        err instanceof Error ? err.message : 'Failed to generate requirements'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleGenerateRequirements}
      disabled={isGenerating || disabled}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
          <span>Auto-Generate</span>
        </>
      )}
    </motion.button>
  );
}
