'use client';

/**
 * Integration Form Component
 * Modal form for creating/editing integrations
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type {
  DbIntegration,
  IntegrationProvider,
  IntegrationEventType,
} from '@/app/db/models/integration.types';

interface ParsedIntegration extends Omit<DbIntegration, 'config' | 'enabled_events'> {
  config: Record<string, unknown>;
  enabled_events: string[];
}

interface IntegrationFormProps {
  projectId: string;
  integration?: ParsedIntegration | null;
  onClose: () => void;
  onSave: () => void;
}

interface RegistryEntry {
  provider: IntegrationProvider;
  name: string;
  description: string;
  supportedEvents: IntegrationEventType[];
}

const PROVIDERS: { value: IntegrationProvider; label: string; icon: string }[] = [
  { value: 'github', label: 'GitHub', icon: '🐙' },
  { value: 'slack', label: 'Slack', icon: '💬' },
  { value: 'discord', label: 'Discord', icon: '🎮' },
  { value: 'webhook', label: 'Custom Webhook', icon: '🔗' },
];

export function IntegrationForm({
  projectId,
  integration,
  onClose,
  onSave,
}: IntegrationFormProps) {
  const [provider, setProvider] = useState<IntegrationProvider>(integration?.provider || 'slack');
  const [name, setName] = useState(integration?.name || '');
  const [description, setDescription] = useState(integration?.description || '');
  const [enabledEvents, setEnabledEvents] = useState<string[]>(integration?.enabled_events || []);
  const [config, setConfig] = useState<Record<string, unknown>>(integration?.config || {});
  const [credentials, setCredentials] = useState<Record<string, unknown>>({});
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Update available events when provider changes
  const availableEvents = registryInfo[provider]?.supportedEvents || allEventTypes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        projectId,
        provider,
        name,
        description: description || null,
        config,
        credentials: Object.keys(credentials).length > 0 ? credentials : null,
        enabledEvents,
      };

      // Add webhook-specific fields
      if (provider === 'webhook' || provider === 'slack' || provider === 'discord') {
        if (webhookUrl) {
          if (provider === 'webhook') {
            payload.webhookUrl = webhookUrl;
            payload.webhookSecret = webhookSecret || null;
          } else {
            payload.credentials = { ...credentials, webhookUrl };
          }
        }
      }

      const url = integration ? '/api/integrations' : '/api/integrations';
      const method = integration ? 'PUT' : 'POST';

      if (integration) {
        payload.id = integration.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        onSave();
      } else {
        setError(data.error || 'Failed to save integration');
      }
    } catch {
      setError('Failed to save integration');
    } finally {
      setSaving(false);
    }
  };

  const toggleEvent = (eventType: string) => {
    setEnabledEvents((prev) =>
      prev.includes(eventType)
        ? prev.filter((e) => e !== eventType)
        : [...prev, eventType]
    );
  };

  const selectAllEvents = () => {
    setEnabledEvents(availableEvents);
  };

  const clearEvents = () => {
    setEnabledEvents([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="integration-form-modal"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 border border-gray-700/80 rounded-xl shadow-2xl shadow-black/40 w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {integration ? 'Edit Integration' : 'Add Integration'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            data-testid="close-form-btn"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Provider Selection */}
          {!integration && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProvider(p.value)}
                    className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                      provider === p.value
                        ? 'border-purple-500 bg-purple-500/10 shadow-sm shadow-purple-500/10'
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                    }`}
                    data-testid={`provider-${p.value}-btn`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <p className="text-sm text-white mt-1">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Integration"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              required
              data-testid="integration-name-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this integration for?"
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              data-testid="integration-description-input"
            />
          </div>

          {/* Provider-specific fields */}
          {(provider === 'slack' || provider === 'discord') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={`https://hooks.${provider}.com/...`}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                data-testid="webhook-url-input"
              />
            </div>
          )}

          {provider === 'webhook' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-endpoint.com/webhook"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  required
                  data-testid="webhook-url-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Signing Secret (optional)
                </label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="For HMAC signature verification"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  data-testid="webhook-secret-input"
                />
              </div>
            </>
          )}

          {provider === 'github' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Owner</label>
                  <input
                    type="text"
                    value={(config.owner as string) || ''}
                    onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                    placeholder="username or org"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    data-testid="github-owner-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Repository</label>
                  <input
                    type="text"
                    value={(config.repo as string) || ''}
                    onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                    placeholder="repo-name"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    data-testid="github-repo-input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Personal Access Token</label>
                <input
                  type="password"
                  value={(credentials.accessToken as string) || ''}
                  onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                  placeholder="ghp_..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  data-testid="github-token-input"
                />
              </div>
            </>
          )}

          {/* Event Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Enabled Events</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllEvents}
                  className="text-xs text-purple-400 hover:text-purple-300"
                  data-testid="select-all-events-btn"
                >
                  Select all
                </button>
                <span className="text-gray-600">|</span>
                <button
                  type="button"
                  onClick={clearEvents}
                  className="text-xs text-gray-400 hover:text-gray-300"
                  data-testid="clear-events-btn"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-800/50 rounded-lg border border-gray-700">
              {availableEvents.map((eventType) => (
                <label
                  key={eventType}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={enabledEvents.includes(eventType)}
                    onChange={() => toggleEvent(eventType)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                    data-testid={`event-${eventType}-checkbox`}
                  />
                  <span className="text-sm text-gray-300">
                    {eventLabels[eventType] || eventType}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            data-testid="cancel-form-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/25"
            data-testid="save-integration-btn"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {integration ? 'Save Changes' : 'Create Integration'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
