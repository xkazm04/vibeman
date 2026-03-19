/**
 * ContextGenerationScanButton
 *
 * Button to trigger context generation scan via Claude CLI.
 * Analyzes codebase and creates context groups and contexts.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Scan, Loader2 } from 'lucide-react';
import { useContextGenerationStore } from '@/stores/contextGenerationStore';
import { buttonVariants } from '@/lib/design-tokens';

interface ContextGenerationScanButtonProps {
  projectId: string;
  className?: string;
}

export const ContextGenerationScanButton: React.FC<ContextGenerationScanButtonProps> = ({
  projectId,
  className = '',
}) => {
  const { startGeneration, isGenerating } = useContextGenerationStore();
  const generating = isGenerating();

  const handleClick = async () => {
    if (generating) return;

    const result = await startGeneration(projectId);
    if (!result.success) {
      console.error('[ContextGeneration] Failed to start:', result.error);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={generating}
      className={`flex items-center gap-2 ${buttonVariants.primary} disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${className}`}
      whileHover={{ scale: generating ? 1 : 1.03 }}
      whileTap={{ scale: generating ? 1 : 0.97 }}
    >
      {generating ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Generating Contexts...</span>
        </>
      ) : (
        <>
          <Scan className="w-5 h-5" />
          <span>Scan Codebase for Contexts</span>
        </>
      )}
    </motion.button>
  );
};

export default ContextGenerationScanButton;
