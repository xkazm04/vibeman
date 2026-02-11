'use client';

import { useState, useEffect } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { DbPersonaTrigger } from '@/app/features/Personas/lib/types';
import { Plus, Trash2, Clock, Webhook, Play, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TRIGGER_TYPE_ICONS = {
  schedule: Clock,
  polling: Clock,
  webhook: Webhook,
  manual: Play,
};

const TRIGGER_TYPE_COLORS = {
  schedule: 'text-primary',
  polling: 'text-accent',
  webhook: 'text-emerald-400',
  manual: 'text-muted-foreground/60',
};

export function TriggerConfig() {
  const selectedPersona = usePersonaStore((state) => state.selectedPersona);
  const createTrigger = usePersonaStore((state) => state.createTrigger);
  const updateTrigger = usePersonaStore((state) => state.updateTrigger);
  const deleteTrigger = usePersonaStore((state) => state.deleteTrigger);

  const [showAddForm, setShowAddForm] = useState(false);
  const [triggerType, setTriggerType] = useState<DbPersonaTrigger['trigger_type']>('manual');
  const [interval, setInterval] = useState('3600');
  const [endpoint, setEndpoint] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [hmacSecret, setHmacSecret] = useState('');
  const [credentialEvents, setCredentialEvents] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetch('/api/personas/credential-events')
      .then(r => r.json())
      .then(data => setCredentialEvents(data.events || []))
      .catch(() => {});
  }, []);

  const personaId = selectedPersona?.id || '';
  const triggers = selectedPersona?.triggers || [];

  if (!selectedPersona) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground/40">
        No persona selected
      </div>
    );
  }

  const handleAddTrigger = async () => {
    const config: Record<string, any> = {};
    if (triggerType === 'schedule') {
      config.interval_seconds = parseInt(interval);
    } else if (triggerType === 'polling') {
      config.interval_seconds = parseInt(interval);
      if (selectedEventId) {
        config.event_id = selectedEventId;
      } else {
        config.endpoint = endpoint;
      }
    } else if (triggerType === 'webhook') {
      if (hmacSecret) {
        config.hmac_secret = hmacSecret;
      }
    }

    await createTrigger(personaId, {
      trigger_type: triggerType,
      config,
      enabled: true,
    });

    setShowAddForm(false);
    setInterval('3600');
    setEndpoint('');
    setSelectedEventId('');
    setHmacSecret('');
  };

  const handleToggleEnabled = async (triggerId: string, currentEnabled: number) => {
    await updateTrigger(personaId, triggerId, { enabled: !currentEnabled });
  };

  const handleDelete = async (triggerId: string) => {
    if (confirm('Are you sure you want to delete this trigger?')) {
      await deleteTrigger(personaId, triggerId);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono text-muted-foreground/50 uppercase tracking-wider">Triggers</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add Trigger
        </button>
      </div>

      {/* Add Trigger Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-secondary/40 backdrop-blur-sm border border-primary/15 rounded-2xl p-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Trigger Type
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as DbPersonaTrigger['trigger_type'])}
                className="w-full px-3 py-2 bg-background/50 border border-primary/15 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              >
                <option value="manual">Manual</option>
                <option value="schedule">Schedule</option>
                <option value="polling">Polling</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>

            {(triggerType === 'schedule' || triggerType === 'polling') && (
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Interval (seconds)
                </label>
                <input
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  min="60"
                  className="w-full px-3 py-2 bg-background/50 border border-primary/15 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                />
              </div>
            )}

            {triggerType === 'polling' && (
              <>
                {credentialEvents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                      <Zap className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                      Credential Event (optional)
                    </label>
                    <select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="w-full px-3 py-2 bg-background/50 border border-primary/15 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                    >
                      <option value="">None - use endpoint URL instead</option>
                      {credentialEvents.map(evt => (
                        <option key={evt.id} value={evt.id}>{evt.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground/40 mt-1">Link to a credential event instead of a custom endpoint</p>
                  </div>
                )}
                {!selectedEventId && (
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                      Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="https://api.example.com/poll"
                      className="w-full px-3 py-2 bg-background/50 border border-primary/15 rounded-xl text-foreground placeholder-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                    />
                  </div>
                )}
              </>
            )}

            {triggerType === 'webhook' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                    HMAC Secret (optional)
                  </label>
                  <input
                    type="text"
                    value={hmacSecret}
                    onChange={(e) => setHmacSecret(e.target.value)}
                    placeholder="Leave empty for no signature verification"
                    className="w-full px-3 py-2 bg-background/50 border border-primary/15 rounded-xl text-foreground placeholder-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground/40 mt-1">If set, incoming webhooks must include x-hub-signature-256 header</p>
                </div>
                <div className="p-3 bg-background/30 rounded-xl border border-primary/10">
                  <p className="text-xs text-muted-foreground/50">Webhook URL will be generated after creation</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-secondary/60 hover:bg-secondary text-foreground/70 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTrigger}
                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-primary/20"
              >
                Create Trigger
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger List */}
      <div className="space-y-2">
        {triggers.map((trigger) => {
          const Icon = TRIGGER_TYPE_ICONS[trigger.trigger_type];
          const colorClass = TRIGGER_TYPE_COLORS[trigger.trigger_type];

          return (
            <motion.div
              key={trigger.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-secondary/40 backdrop-blur-sm border border-primary/15 rounded-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className={`w-5 h-5 mt-0.5 ${colorClass}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium capitalize ${colorClass}`}>
                        {trigger.trigger_type}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${
                        trigger.enabled
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-secondary/60 text-muted-foreground/40 border border-primary/10'
                      }`}>
                        {trigger.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    {trigger.config && (() => {
                      const config = typeof trigger.config === 'string' ? JSON.parse(trigger.config) : trigger.config;
                      return (Object.keys(config).length > 0 || trigger.trigger_type === 'webhook') ? (
                        <div className="mt-2 text-xs text-muted-foreground/50 space-y-1">
                          {config.interval_seconds && (
                            <div>Interval: {config.interval_seconds}s</div>
                          )}
                          {config.event_id && (
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400/60" />
                              Event: {credentialEvents.find(e => e.id === config.event_id)?.name || config.event_id}
                            </div>
                          )}
                          {config.endpoint && (
                            <div className="truncate">Endpoint: {config.endpoint}</div>
                          )}
                          {trigger.trigger_type === 'webhook' && (
                            <div className="mt-2 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground/50 font-mono truncate flex-1">
                                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/personas/webhooks/${trigger.id}`}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/api/personas/webhooks/${trigger.id}`);
                                  }}
                                  className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex-shrink-0"
                                  title="Copy webhook URL"
                                >
                                  Copy URL
                                </button>
                              </div>
                              {config.hmac_secret && (
                                <div className="text-xs text-muted-foreground/40">
                                  HMAC: {'••••••••'}{config.hmac_secret.slice(-4)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleEnabled(trigger.id, trigger.enabled)}
                    className="p-1.5 hover:bg-secondary/60 rounded-lg transition-colors"
                    title={trigger.enabled ? 'Disable' : 'Enable'}
                  >
                    {trigger.enabled ? (
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(trigger.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete trigger"
                  >
                    <Trash2 className="w-4 h-4 text-red-400/70" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {triggers.length === 0 && (
          <div className="text-center py-10 text-muted-foreground/40 text-sm">
            No triggers configured. Add one to automate this persona.
          </div>
        )}
      </div>
    </div>
  );
}
