'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, Clock, Loader2 } from 'lucide-react';
import type { CredentialTemplateEvent } from '@/lib/personas/credentialTemplates';
import type { DbCredentialEvent } from '@/app/features/Personas/lib/types';

interface CredentialEventConfigProps {
  credentialId: string;
  serviceType: string;
  events?: CredentialTemplateEvent[];
}

export function CredentialEventConfig({ credentialId, serviceType, events: eventsProp }: CredentialEventConfigProps) {
  const [credentialEvents, setCredentialEvents] = useState<DbCredentialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const eventTemplates = eventsProp ?? [];

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/personas/credential-events');
      if (res.ok) {
        const data = await res.json();
        const allEvents: DbCredentialEvent[] = data.events || [];
        setCredentialEvents(allEvents.filter((e: DbCredentialEvent) => e.credential_id === credentialId));
      }
    } catch (err) {
      console.error('Failed to fetch credential events:', err);
    } finally {
      setLoading(false);
    }
  }, [credentialId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getEventForTemplate = (eventTemplateId: string): DbCredentialEvent | undefined => {
    return credentialEvents.find(e => e.event_template_id === eventTemplateId);
  };

  const handleToggleEvent = async (eventTemplateId: string, eventTemplateName: string, defaultConfig?: Record<string, unknown>) => {
    const existing = getEventForTemplate(eventTemplateId);
    setSaving(eventTemplateId);

    try {
      if (existing) {
        await fetch(`/api/personas/credential-events/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: !existing.enabled }),
        });
      } else {
        await fetch('/api/personas/credential-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential_id: credentialId,
            event_template_id: eventTemplateId,
            name: eventTemplateName,
            config: defaultConfig || {},
            enabled: true,
          }),
        });
      }

      await fetchEvents();
    } catch (err) {
      console.error('Failed to toggle event:', err);
    } finally {
      setSaving(null);
    }
  };

  const handleUpdatePollingInterval = async (eventId: string, intervalSeconds: number) => {
    const existing = credentialEvents.find(e => e.id === eventId);
    if (!existing) return;

    setSaving(existing.event_template_id);

    try {
      const currentConfig = existing.config ? JSON.parse(existing.config) : {};
      const updatedConfig = { ...currentConfig, pollingIntervalSeconds: intervalSeconds };

      await fetch(`/api/personas/credential-events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updatedConfig }),
      });

      await fetchEvents();
    } catch (err) {
      console.error('Failed to update polling interval:', err);
    } finally {
      setSaving(null);
    }
  };

  if (eventTemplates.length === 0) {
    return (
      <div className="text-xs text-muted-foreground/40 py-3">
        No event triggers available for this service type.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground/40 text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading events...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-3.5 h-3.5 text-amber-400/70" />
        <span className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Event Triggers</span>
      </div>

      {eventTemplates.map((et) => {
        const existing = getEventForTemplate(et.id);
        const isEnabled = existing ? !!existing.enabled : false;
        const isSaving = saving === et.id;
        const config = existing?.config ? JSON.parse(existing.config) : et.defaultConfig || {};
        const pollingInterval = config.pollingIntervalSeconds || 60;

        return (
          <div
            key={et.id}
            className={`p-3 rounded-xl border transition-all ${
              isEnabled
                ? 'bg-amber-500/5 border-amber-500/20'
                : 'bg-secondary/20 border-border/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground/80">{et.name}</span>
                  {isSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/40" />}
                </div>
                <p className="text-xs text-muted-foreground/40 mt-0.5">{et.description}</p>
              </div>

              {/* Toggle */}
              <button
                onClick={() => handleToggleEvent(et.id, et.name, et.defaultConfig)}
                disabled={isSaving}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  isEnabled ? 'bg-amber-500' : 'bg-secondary/60'
                } ${isSaving ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Config (visible when enabled and event exists) */}
            {isEnabled && existing && (
              <div className="mt-3 pt-3 border-t border-border/10 space-y-2">
                <div className="flex items-center gap-3">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
                  <label className="text-xs text-muted-foreground/50">Polling interval</label>
                  <select
                    value={pollingInterval}
                    onChange={(e) => handleUpdatePollingInterval(existing.id, parseInt(e.target.value))}
                    className="px-2 py-1 bg-background/50 border border-border/30 rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value={10}>10 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={120}>2 minutes</option>
                    <option value={300}>5 minutes</option>
                    <option value={600}>10 minutes</option>
                  </select>
                </div>

                {existing.last_polled_at && (
                  <div className="text-[11px] text-muted-foreground/50">
                    Last polled: {new Date(existing.last_polled_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
