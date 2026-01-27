'use client';

/**
 * IntegrationDetailPanel
 * Inline editing panel for integrations (replaces modal)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit3,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Zap,
  ExternalLink,
  Cloud,
} from 'lucide-react';
import { SyncButton } from './SyncButton';
import type {
  IntegrationProvider,
  IntegrationEventType,
} from '@/app/db/models/integration.types';
import { PROVIDER_CONFIG, type ParsedIntegration } from './IntegrationListColumn';

// Shared input class with no focus outline
const inputClass = 'w-full px-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-purple-500/50 transition-colors disabled:opacity-60';

// Dark gradient for panel
const darkGradient = 'from-gray-900/95 via-gray-900/90 to-gray-950/95';

// All available providers
const ALL_PROVIDERS: IntegrationProvider[] = [
  'github',
  'gitlab',
  'slack',
  'discord',
  'webhook',
  'jira',
  'linear',
  'notion',
  'supabase',
  'postgres',
];

interface RegistryEntry {
  provider: IntegrationProvider;
  name: string;
  description: string;
  supportedEvents: IntegrationEventType[];
  configSchema?: Record<string, unknown>;
  credentialsSchema?: Record<string, unknown>;
}

interface IntegrationDetailPanelProps {
  integration: ParsedIntegration | null;
  isNew: boolean;
  projectId: string;
  onClose: () => void;
  onSave: (integration: ParsedIntegration) => void;
  onTest?: (id: string) => Promise<{ success: boolean; message: string }>;
}

export function IntegrationDetailPanel({
  integration,
  isNew,
  projectId,
  onClose,
  onSave,
  onTest,
}: IntegrationDetailPanelProps) {
  // Form state
  const [isEditing, setIsEditing] = useState(isNew);
  const [provider, setProvider] = useState<IntegrationProvider>(integration?.provider || 'slack');
  const [name, setName] = useState(integration?.name || '');
  const [description, setDescription] = useState(integration?.description || '');
  const [enabledEvents, setEnabledEvents] = useState<string[]>(integration?.enabled_events || []);
  const [config, setConfig] = useState<Record<string, unknown>>(integration?.config || {});
  const [credentials, setCredentials] = useState<Record<string, unknown>>({});

  // UI state
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registryInfo, setRegistryInfo] = useState<Record<string, RegistryEntry>>({});
  const [allEventTypes, setAllEventTypes] = useState<IntegrationEventType[]>([]);
  const [eventLabels, setEventLabels] = useState<Record<string, string>>({});

  // Fetch registry info
  useEffect(() => {
    fetch('/api/integrations/registry')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const registry: Record<string, RegistryEntry> = {};
          for (const entry of data.integrations) {
            registry[entry.provider] = entry;
          }
          setRegistryInfo(registry);
          setAllEventTypes(data.eventTypes || []);
          setEventLabels(data.eventTypeLabels || {});
        }
      })
      .catch(console.error);
  }, []);

  // Sync form state when integration changes
  useEffect(() => {
    if (integration) {
      setProvider(integration.provider);
      setName(integration.name);
      setDescription(integration.description || '');
      setEnabledEvents(integration.enabled_events || []);
      setConfig(integration.config || {});
      setCredentials({});
    } else {
      setProvider('slack');
      setName('');
      setDescription('');
      setEnabledEvents([]);
      setConfig({});
      setCredentials({});
    }
    setIsEditing(isNew);
    setError(null);
    setSuccess(null);
  }, [integration, isNew]);

  // Available events for selected provider
  const availableEvents = registryInfo[provider]?.supportedEvents || allEventTypes;

  // Theme based on provider
  const providerTheme = PROVIDER_CONFIG[provider];

  // Handle save
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        projectId,
        provider,
        name: name.trim(),
        description: description.trim() || null,
        config,
        credentials: Object.keys(credentials).length > 0 ? credentials : null,
        enabledEvents,
        ...(integration?.id && { id: integration.id }),
      };

      const response = await fetch('/api/integrations', {
        method: integration ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Integration saved');
        setIsEditing(false);
        onSave(data.integration);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save integration');
    } finally {
      setSaving(false);
    }
  };

  // Handle test connection
  const handleTest = async () => {
    if (!integration?.id || !onTest) return;

    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onTest(integration.id);
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
    } finally {
      setTesting(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
    }
  };

  // Toggle event
  const toggleEvent = (eventType: string) => {
    setEnabledEvents((prev) =>
      prev.includes(eventType)
        ? prev.filter((e) => e !== eventType)
        : [...prev, eventType]
    );
  };

  // Render provider-specific config fields
  const renderConfigFields = () => {
    switch (provider) {
      case 'github':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Owner</label>
                <input
                  type="text"
                  value={(config.owner as string) || ''}
                  onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                  placeholder="username or org"
                  disabled={!isEditing}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Repository</label>
                <input
                  type="text"
                  value={(config.repo as string) || ''}
                  onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                  placeholder="repo-name"
                  disabled={!isEditing}
                  className={inputClass}
                />
              </div>
            </div>
            {isEditing && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Personal Access Token</label>
                <input
                  type="password"
                  value={(credentials.accessToken as string) || ''}
                  onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                  placeholder="ghp_..."
                  className={inputClass}
                />
              </div>
            )}
          </>
        );

      case 'slack':
      case 'discord':
        return (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Webhook URL</label>
            <input
              type="url"
              value={(credentials.webhookUrl as string) || ''}
              onChange={(e) => setCredentials({ ...credentials, webhookUrl: e.target.value })}
              placeholder={`https://hooks.${provider}.com/...`}
              disabled={!isEditing}
              className={inputClass}
            />
          </div>
        );

      case 'webhook':
        return (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Webhook URL</label>
              <input
                type="url"
                value={(config.url as string) || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://your-endpoint.com/webhook"
                disabled={!isEditing}
                className={inputClass}
              />
            </div>
            {isEditing && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Signing Secret (optional)</label>
                <input
                  type="password"
                  value={(credentials.secret as string) || ''}
                  onChange={(e) => setCredentials({ ...credentials, secret: e.target.value })}
                  placeholder="For HMAC signature verification"
                  className={inputClass}
                />
              </div>
            )}
          </>
        );

      case 'supabase':
        return (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Project URL</label>
              <input
                type="url"
                value={(config.projectUrl as string) || ''}
                onChange={(e) => setConfig({ ...config, projectUrl: e.target.value })}
                placeholder="https://xxx.supabase.co"
                disabled={!isEditing}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Table Name</label>
              <input
                type="text"
                value={(config.tableName as string) || ''}
                onChange={(e) => setConfig({ ...config, tableName: e.target.value })}
                placeholder="events"
                disabled={!isEditing}
                className={inputClass}
              />
            </div>
            {isEditing && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Anon Key</label>
                  <input
                    type="password"
                    value={(credentials.anonKey as string) || ''}
                    onChange={(e) => setCredentials({ ...credentials, anonKey: e.target.value })}
                    placeholder="eyJ..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Service Role Key (optional)</label>
                  <input
                    type="password"
                    value={(credentials.serviceRoleKey as string) || ''}
                    onChange={(e) => setCredentials({ ...credentials, serviceRoleKey: e.target.value })}
                    placeholder="eyJ..."
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-500 mt-1">Required to validate that remote message broker tables exist</p>
                </div>
              </>
            )}
          </>
        );

      case 'postgres':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Host</label>
                <input
                  type="text"
                  value={(config.host as string) || ''}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  placeholder="localhost"
                  disabled={!isEditing}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Port</label>
                <input
                  type="number"
                  value={(config.port as number) || 5432}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 5432 })}
                  disabled={!isEditing}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Database</label>
                <input
                  type="text"
                  value={(config.database as string) || ''}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  placeholder="mydb"
                  disabled={!isEditing}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Table Name</label>
                <input
                  type="text"
                  value={(config.tableName as string) || ''}
                  onChange={(e) => setConfig({ ...config, tableName: e.target.value })}
                  placeholder="events"
                  disabled={!isEditing}
                  className={inputClass}
                />
              </div>
            </div>
            {isEditing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={(credentials.username as string) || ''}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    placeholder="postgres"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={(credentials.password as string) || ''}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="****"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`rounded-xl bg-gradient-to-br ${darkGradient} border ${providerTheme?.border || 'border-gray-700/50'} overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center gap-3">
          <span className="text-xl">{providerTheme?.icon || '🔌'}</span>
          <h3 className={`font-semibold ${providerTheme?.text || 'text-gray-300'}`}>
            {isNew ? 'New Integration' : integration?.name}
          </h3>
          {!isNew && integration && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              integration.status === 'active' ? 'bg-green-500/20 text-green-300' :
              integration.status === 'error' ? 'bg-red-500/20 text-red-300' :
              'bg-gray-500/20 text-gray-300'
            }`}>
              {integration.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
          )}
          {!isNew && !isEditing && onTest && (
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Test
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-4 py-2 text-sm ${
              error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {error ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
              <span>{error || success}</span>
            </div>
            {/* Show schema link when tables are missing */}
            {error?.includes('Missing required tables') && (
              <div className="mt-2 ml-6">
                <a
                  href="https://github.com/your-repo/vibeman/blob/main/docs/REMOTE_MESSAGE_BROKER.md#step-2-run-sql-schema"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-md transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Schema (copy SQL to Supabase)
                </a>
                <p className="text-xs text-gray-500 mt-1">
                  Run the SQL in your Supabase SQL Editor to create the required tables
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Provider Selection (New mode only) - Compact icon grid */}
        {isNew && isEditing && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">Select Provider</label>
            <div className="flex flex-wrap gap-1">
              {ALL_PROVIDERS.map((p) => {
                const pConfig = PROVIDER_CONFIG[p];
                const isSelected = provider === p;
                return (
                  <motion.button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex flex-col items-center px-2 py-1.5 rounded-md transition-colors ${
                      isSelected
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                    }`}
                  >
                    <span className="text-base">{pConfig?.icon || '🔌'}</span>
                    <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-300' : 'text-gray-500'}`}>
                      {pConfig?.label || p}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Name & Description */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Integration"
              disabled={!isEditing}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              disabled={!isEditing}
              className={inputClass}
            />
          </div>
        </div>

        {/* Provider-specific config */}
        <div className="border-t border-gray-700/50 pt-4 space-y-3">
          <h4 className="text-xs font-medium text-gray-400">Configuration</h4>
          {renderConfigFields()}
        </div>

        {/* Event Selection */}
        <div className="border-t border-gray-700/50 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-400">
              Enabled Events ({enabledEvents.length})
            </h4>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEnabledEvents(availableEvents)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setEnabledEvents([])}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto p-2 bg-gray-800/30 rounded-lg">
            {availableEvents.map((eventType) => (
              <label
                key={eventType}
                className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                  isEditing ? 'hover:bg-gray-700/50 cursor-pointer' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={enabledEvents.includes(eventType)}
                  onChange={() => isEditing && toggleEvent(eventType)}
                  disabled={!isEditing}
                  className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-purple-500"
                />
                <span className="text-gray-300 truncate">
                  {eventLabels[eventType] || eventType}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Supabase Actions - Show sync button when Supabase is connected */}
        {!isNew && !isEditing && provider === 'supabase' && integration?.status === 'active' && (
          <div className="border-t border-gray-700/50 pt-4">
            <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Cloud className="w-3 h-3" />
              Remote Sync Actions
            </h4>
            <div className="flex flex-wrap gap-2">
              <SyncButton
                projectId={projectId}
                disabled={false}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Push pending directions and requirements to Butler for mobile triage
            </p>
          </div>
        )}

        {/* Save Button (Edit Mode) */}
        {isEditing && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-700/50 pt-4">
            {!isNew && (
              <motion.button
                onClick={() => setIsEditing(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </motion.button>
            )}
            <motion.button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isNew ? 'Create Integration' : 'Save Changes'}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
