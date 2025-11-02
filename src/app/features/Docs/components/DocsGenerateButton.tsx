import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';

interface DocsGenerateButtonProps {
  onGenerate: () => void;
  generating: boolean;
  hasExistingDocs: boolean;
}

export default function DocsGenerateButton({
  onGenerate,
  generating,
  hasExistingDocs
}: DocsGenerateButtonProps) {
  return (
    <motion.button
      onClick={onGenerate}
      disabled={generating}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
        generating
          ? 'bg-blue-500/50 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
      } text-white shadow-lg`}
    >
      {generating ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          {hasExistingDocs ? 'Regenerate All' : 'Generate Docs'}
        </>
      )}
    </motion.button>
  );
}
