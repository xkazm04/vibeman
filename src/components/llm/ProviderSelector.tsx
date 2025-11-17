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
  showAllProviders?: boolean; // NEW: Show all providers regardless of configuration
}

/**
 * Reusable provider selector component
 * Displays provider icons and allows user to select their preferred LLM provider
 * By default shows all providers. Set showAllProviders=false to only show configured ones.
 */
export default function ProviderSelector({
  selectedProvider,
  onSelectProvider,
  disabled = false,
  compact = false,
  showAllProviders = true
}: ProviderSelectorProps) {
  const { configured, isLoading } = useProviderAvailability();

  // Filter providers to only show configured ones (unless showAllProviders is true)
  const availableProviders = useMemo(() => {
    if (showAllProviders) {
      return LLM_PROVIDERS;
    }
    return LLM_PROVIDERS.filter((provider) => configured[provider.value]);
  }, [configured, showAllProviders]);

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
      {availableProviders.map((provider) => {
        const isConfigured = configured[provider.value];

        return (
          <motion.button
            key={provider.value}
            onClick={() => onSelectProvider(provider.value)}
            disabled={disabled}
            className={`relative ${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg border-2 transition-all duration-300 ${
              selectedProvider === provider.value
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                : isConfigured
                ? 'border-gray-700/40 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60'
                : 'border-yellow-700/40 bg-yellow-900/20 hover:border-yellow-600 hover:bg-yellow-800/30'
            }`}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            title={`${provider.name}${!isConfigured ? ' (Not configured)' : ''}`}
            data-testid={`provider-selector-${provider.value}`}
          >
            <Image
              src={provider.icon}
              alt={provider.name}
              width={compact ? 20 : 24}
              height={compact ? 20 : 24}
              className={`mx-auto ${!isConfigured ? 'opacity-50' : ''}`}
            />
            {!isConfigured && showAllProviders && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-gray-900"
                   title="Not configured" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
