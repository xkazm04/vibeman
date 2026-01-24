'use client';

/**
 * Integration Card Component
 * Displays a single integration with actions
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DbIntegration, IntegrationStatus, IntegrationProvider } from '@/app/db/models/integration.types';

interface ParsedIntegration extends Omit<DbIntegration, 'config' | 'enabled_events'> {
  config: Record<string, unknown>;
  enabled_events: string[];
}

interface IntegrationCardProps {
  integration: ParsedIntegration;
  onTest: (id: string) => Promise<{ success: boolean; message: string }>;
  onEdit: (integration: ParsedIntegration) => void;
  onDelete: (id: string) => void;
}

const PROVIDER_ICONS: Record<IntegrationProvider, string> = {
  github: '🐙',
  gitlab: '🦊',
  slack: '💬',
  discord: '🎮',
  webhook: '🔗',
  jira: '📋',
  linear: '📐',
  notion: '📝',
  supabase: '⚡',
  postgres: '🐘',
};

const PROVIDER_COLORS: Record<IntegrationProvider, string> = {
  github: 'from-gray-700 to-gray-800',
  gitlab: 'from-orange-700/20 to-orange-900/20',
  slack: 'from-purple-700/20 to-purple-900/20',
  discord: 'from-indigo-700/20 to-indigo-900/20',
  webhook: 'from-blue-700/20 to-blue-900/20',
  jira: 'from-blue-600/20 to-blue-800/20',
  linear: 'from-violet-700/20 to-violet-900/20',
  notion: 'from-gray-600/20 to-gray-800/20',
  supabase: 'from-emerald-700/20 to-emerald-900/20',
  postgres: 'from-blue-800/20 to-blue-950/20',
};

const STATUS_STYLES: Record<IntegrationStatus, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' },
  inactive: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400' },
  error: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
};

export function IntegrationCard({
  integration,
  onTest,
  onEdit,
  onDelete,
}: IntegrationCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    const result = await onTest(integration.id);
    setTestResult(result);
    setTesting(false);

    // Clear result after 5 seconds
    setTimeout(() => setTestResult(null), 5000);
  };

  const statusStyle = STATUS_STYLES[integration.status];
  const providerIcon = PROVIDER_ICONS[integration.provider] || '🔌';
  const providerColor = PROVIDER_COLORS[integration.provider] || 'from-gray-700 to-gray-800';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative overflow-hidden rounded-xl border border-gray-700/50 bg-gradient-to-br ${providerColor}`}
      data-testid={`integration-card-${integration.id}`}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{providerIcon}</span>
            <div>
              <h3 className="font-semibold text-white">{integration.name}</h3>
              <p className="text-xs text-gray-400 capitalize">{integration.provider}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusStyle.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            <span className={`text-xs capitalize ${statusStyle.text}`}>
              {integration.status}
            </span>
          </div>
        </div>

        {/* Description */}
        {integration.description && (
          <p className="mt-2 text-sm text-gray-400 line-clamp-2">
            {integration.description}
          </p>
        )}

        {/* Events Count */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span>{integration.enabled_events.length} events enabled</span>
          {integration.last_sync_at && (
            <span>
              Last sync: {new Date(integration.last_sync_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {integration.last_error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <p className="text-xs text-red-400 truncate" title={integration.last_error}>
            {integration.last_error}
          </p>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div
          className={`px-4 py-2 border-t ${
            testResult.success
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          <p className={`text-xs ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {testResult.message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="p-3 border-t border-gray-700/30 flex items-center justify-between">
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-3 py-1.5 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          data-testid={`test-integration-${integration.id}-btn`}
        >
          {testing ? (
            <>
              <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Test
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(integration)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            data-testid={`edit-integration-${integration.id}-btn`}
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={() => onDelete(integration.id)}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            data-testid={`delete-integration-${integration.id}-btn`}
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
