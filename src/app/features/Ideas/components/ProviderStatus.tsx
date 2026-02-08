'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Loader2, Zap, Server } from 'lucide-react';

export type ProviderState = 'connected' | 'disconnected' | 'checking' | 'error' | 'unknown';

interface ProviderStatusProps {
  provider: string;
  state: ProviderState;
  modelName?: string;
  tokenEstimate?: number;
  className?: string;
}

const stateConfig: Record<ProviderState, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  connected: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    label: 'Connected',
  },
  disconnected: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Disconnected',
  },
  checking: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Checking...',
  },
  error: {
    icon: AlertCircle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'Error',
  },
  unknown: {
    icon: Server,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    label: 'Unknown',
  },
};

/**
 * ProviderStatus - Shows LLM provider connection status
 */
export function ProviderStatus({
  provider,
  state,
  modelName,
  tokenEstimate,
  className = '',
}: ProviderStatusProps) {
  const config = stateConfig[state];
  const Icon = config.icon;
  const isChecking = state === 'checking';

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg ${config.bgColor}
        border border-gray-700/50 transition-all duration-200 hover:border-gray-600/60 ${className}
      `}
    >
      {/* Status Icon */}
      <motion.div
        animate={isChecking ? { rotate: 360 } : undefined}
        transition={isChecking ? { duration: 1, repeat: Infinity, ease: 'linear' } : undefined}
      >
        <Icon className={`w-4 h-4 ${config.color}`} />
      </motion.div>

      {/* Provider Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">{provider}</span>
          {modelName && (
            <span className="text-xs text-gray-500 truncate">({modelName})</span>
          )}
        </div>
        <span className={`text-xs ${config.color}`}>{config.label}</span>
      </div>

      {/* Token Estimate */}
      {tokenEstimate !== undefined && state === 'connected' && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Zap className="w-3 h-3" />
          <span>~{tokenEstimate.toLocaleString()} tokens</span>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Compact status badge for headers
 */
export function ProviderStatusBadge({
  state,
  provider,
  className = '',
}: {
  state: ProviderState;
  provider?: string;
  className?: string;
}) {
  const config = stateConfig[state];
  const Icon = config.icon;
  const isChecking = state === 'checking';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full
        ${config.bgColor} border border-gray-700/30 ${className}
      `}
      title={`${provider || 'Provider'}: ${config.label}`}
    >
      <motion.div
        animate={isChecking ? { rotate: 360 } : undefined}
        transition={isChecking ? { duration: 1, repeat: Infinity, ease: 'linear' } : undefined}
      >
        <Icon className={`w-3 h-3 ${config.color}`} />
      </motion.div>
      {provider && (
        <span className="text-[10px] font-medium text-gray-400">{provider}</span>
      )}
    </motion.div>
  );
}

/**
 * Provider status indicator dot
 */
export function ProviderStatusDot({
  state,
  className = '',
}: {
  state: ProviderState;
  className?: string;
}) {
  const config = stateConfig[state];
  const isActive = state === 'connected' || state === 'checking';

  return (
    <motion.div
      className={`w-2 h-2 rounded-full ${className}`}
      style={{
        backgroundColor: state === 'connected' ? '#22c55e' :
                        state === 'checking' ? '#3b82f6' :
                        state === 'error' ? '#f59e0b' :
                        state === 'disconnected' ? '#ef4444' :
                        '#6b7280',
      }}
      animate={isActive ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : undefined}
      transition={isActive ? { duration: 2, repeat: Infinity } : undefined}
      title={config.label}
    />
  );
}

/**
 * Multi-provider status row
 */
export function ProviderStatusRow({
  providers,
  className = '',
}: {
  providers: { name: string; state: ProviderState; model?: string }[];
  className?: string;
}) {
  const connectedCount = providers.filter(p => p.state === 'connected').length;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">LLM Providers</span>
        <span className="text-gray-400">
          {connectedCount}/{providers.length} connected
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {providers.map(provider => (
          <ProviderStatusBadge
            key={provider.name}
            state={provider.state}
            provider={provider.name}
          />
        ))}
      </div>
    </div>
  );
}

export default ProviderStatus;
