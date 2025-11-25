/**
 * Provider Selector Panel Component
 *
 * Animated panel for selecting AI provider
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupportedProvider } from '@/lib/llm/types';
import ProviderSelector from '@/components/llm/ProviderSelector';

interface ProviderSelectorPanelProps {
  isVisible: boolean;
  selectedProvider: SupportedProvider;
  isGenerating: boolean;
  onSelectProvider: (provider: SupportedProvider) => void;
}

export default function ProviderSelectorPanel({
  isVisible,
  selectedProvider,
  isGenerating,
  onSelectProvider,
}: ProviderSelectorPanelProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden border-b border-white/5"
        >
          <div className="p-4 bg-black/20 flex items-center gap-3">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
              Select AI Provider:
            </span>
            <ProviderSelector
              selectedProvider={selectedProvider}
              onSelectProvider={onSelectProvider}
              disabled={isGenerating}
              compact={true}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
