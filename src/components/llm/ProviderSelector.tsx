'use client';

import React, { useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { X, Clock } from 'lucide-react';
import { SupportedProvider } from '@/lib/llm/types';
import { LLM_PROVIDERS } from '@/lib/llm/providers-config';
import { useProviderAvailability } from '@/hooks/useProviderAvailability';
import { useProviderHealth, type ProviderHealthMetrics } from '@/hooks/useProviderHealth';

interface ProviderSelectorProps {
  selectedProvider: SupportedProvider;
  onSelectProvider: (provider: SupportedProvider) => void;
  disabled?: boolean;
  compact?: boolean;
  showAllProviders?: boolean;
}

/** Derive ring color class + animation from circuit breaker metrics */
function getHealthRing(m: ProviderHealthMetrics | undefined): {
  ringClass: string;
  animClass: string;
  badge: 'x' | 'clock' | null;
} {
  if (!m) return { ringClass: '', animClass: '', badge: null };

  if (m.rateLimited) {
    return {
      ringClass: 'ring-2 ring-orange-500/60',
      animClass: '',
      badge: 'clock',
    };
  }

  switch (m.state) {
    case 'open':
      return {
        ringClass: 'ring-2 ring-red-500/60',
        animClass: '',
        badge: 'x',
      };
    case 'half-open':
      return {
        ringClass: 'ring-2 ring-amber-500/60',
        animClass: 'animate-[health-pulse_1.5s_ease-in-out_infinite]',
        badge: null,
      };
    case 'closed':
      return {
        ringClass: 'ring-2 ring-emerald-500/60',
        animClass: 'animate-[health-pulse_4s_ease-in-out_infinite]',
        badge: null,
      };
    default:
      return { ringClass: '', animClass: '', badge: null };
  }
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
  const { configured, providers, isLoading } = useProviderAvailability();
  const { metrics: healthMetrics } = useProviderHealth();

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

  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!groupRef.current) return;
    const buttons = Array.from(groupRef.current.querySelectorAll('button')) as HTMLElement[];
    const currentIndex = buttons.findIndex(btn => btn === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
    }

    if (nextIndex >= 0 && buttons[nextIndex]) {
      buttons[nextIndex].focus();
    }
  }, []);

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="LLM Provider"
      onKeyDown={handleKeyDown}
      className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}
    >
      {availableProviders.map((provider) => {
        const isConfigured = configured[provider.value];
        const status = providers[provider.value];
        const tooltip = isConfigured
          ? provider.name
          : status?.suggestion
            ? `${provider.name}: ${status.suggestion}`
            : `${provider.name} (Not configured)`;

        const health = healthMetrics[provider.value];
        const ring = getHealthRing(health);

        return (
          <motion.button
            key={provider.value}
            role="radio"
            aria-checked={selectedProvider === provider.value}
            aria-label={tooltip}
            tabIndex={selectedProvider === provider.value ? 0 : -1}
            onClick={() => onSelectProvider(provider.value)}
            disabled={disabled}
            className={`group relative ${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg border-2 transition-all duration-300 ${
              selectedProvider === provider.value
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                : isConfigured
                ? 'border-gray-700/40 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60'
                : 'border-yellow-700/40 bg-yellow-900/20 hover:border-yellow-600 hover:bg-yellow-800/30'
            }`}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            title={tooltip}
            data-testid={`provider-selector-${provider.value}`}
          >
            {/* Circuit breaker health ring overlay */}
            {ring.ringClass && (
              <span
                className={`pointer-events-none absolute inset-0 rounded-lg transition-colors duration-500 ${ring.ringClass} ${ring.animClass}`}
              />
            )}
            <Image
              src={provider.icon}
              alt={provider.name}
              width={compact ? 20 : 24}
              height={compact ? 20 : 24}
              className={`mx-auto ${!isConfigured ? 'opacity-50' : ''}`}
            />
            {/* Open circuit X badge */}
            {ring.badge === 'x' && (
              <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-600 border border-gray-900">
                <X className="w-2 h-2 text-white" strokeWidth={3} />
              </span>
            )}
            {/* Rate-limited clock badge */}
            {ring.badge === 'clock' && (
              <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-orange-600 border border-gray-900">
                <Clock className="w-2 h-2 text-white" strokeWidth={3} />
              </span>
            )}
            {!isConfigured && showAllProviders && !ring.badge && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-gray-900" />
            )}
            {!isConfigured && status?.suggestion && (
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48
                              hidden group-hover:block z-50">
                <div className="bg-gray-900 border border-yellow-700/50 rounded-lg px-3 py-2 text-xs shadow-xl">
                  <p className="text-yellow-400 font-medium mb-0.5">{status.reason.replace(/_/g, ' ')}</p>
                  <p className="text-gray-300">{status.suggestion}</p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 border-b border-r
                                border-yellow-700/50 rotate-45" />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
