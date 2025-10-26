'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { SupportedProvider } from '@/lib/llm/types';
import { LLM_PROVIDERS } from '@/lib/llm/providers-config';
import { useProviderAvailability } from '@/hooks/useProviderAvailability';

interface ProviderSelectorProps {
  selectedProvider: SupportedProvider;
  onSelectProvider: (provider: SupportedProvider) => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Reusable provider selector component
 * Displays provider icons and allows user to select their preferred LLM provider
 * Only shows providers that are properly configured (have API keys or are available)
 */
export default function ProviderSelector({
  selectedProvider,
  onSelectProvider,
  disabled = false,
  compact = false
}: ProviderSelectorProps) {
  const { configured, isLoading } = useProviderAvailability();

  // Filter providers to only show configured ones
  const availableProviders = useMemo(() => {
    return LLM_PROVIDERS.filter((provider) => configured[provider.value]);
  }, [configured]);

  // Show loading state briefly
  if (isLoading && availableProviders.length === 0) {
    return (
      <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg border-2 border-gray-700/40 bg-gray-800/40 animate-pulse`} />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {availableProviders.map((provider) => (
        <motion.button
          key={provider.value}
          onClick={() => onSelectProvider(provider.value)}
          disabled={disabled}
          className={`relative ${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg border-2 transition-all duration-300 ${
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
            width={compact ? 20 : 24}
            height={compact ? 20 : 24}
            className="mx-auto"
          />
        </motion.button>
      ))}
    </div>
  );
}
