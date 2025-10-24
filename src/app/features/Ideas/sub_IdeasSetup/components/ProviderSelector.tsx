'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { SupportedProvider } from '@/lib/llm/types';
import { LLM_PROVIDERS } from '../../lib/llmProviders';

interface ProviderSelectorProps {
  selectedProvider: SupportedProvider;
  onSelectProvider: (provider: SupportedProvider) => void;
  disabled?: boolean;
}

export default function ProviderSelector({
  selectedProvider,
  onSelectProvider,
  disabled = false
}: ProviderSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {LLM_PROVIDERS.map((provider) => (
        <motion.button
          key={provider.value}
          onClick={() => onSelectProvider(provider.value)}
          disabled={disabled}
          className={`relative w-10 h-10 rounded-lg border-2 transition-all duration-300 ${
            selectedProvider === provider.value
              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
              : 'border-gray-700/40 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60'
          }`}
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          title={provider.name}
        >
          <Image
            src={provider.icon}
            alt={provider.name}
            width={24}
            height={24}
            className="mx-auto"
          />
        </motion.button>
      ))}
    </div>
  );
}
