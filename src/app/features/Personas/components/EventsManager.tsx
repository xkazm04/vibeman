'use client';

import { useState, useEffect } from 'react';
import { Zap, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCredentialTemplate } from '@/lib/personas/credentialTemplates';
import type { DbCredentialEvent, CredentialServiceType } from '@/app/features/Personas/lib/types';

interface CredentialGroup {
  credentialId: string;
  credentialName: string;
  serviceType: CredentialServiceType;
  events: DbCredentialEvent[];
}

export function EventsManager() {
  const [groups, setGroups] = useState<CredentialGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [credRes, eventRes] = await Promise.all([
        fetch('/api/personas/credentials'),
        fetch('/api/personas/credential-events'),
      ]);

      const credData = await credRes.json();
      const eventData = await eventRes.json();

      const credentials = credData.credentials || [];
      const events: DbCredentialEvent[] = eventData.events || [];

      const grouped: CredentialGroup[] = credentials.map((cred: { id: string; name: string; service_type: CredentialServiceType }) => ({
        credentialId: cred.id,
        credentialName: cred.name,
        serviceType: cred.service_type,
        events: events.filter((e: DbCredentialEvent) => e.credential_id === cred.id),
      }));

      setGroups(grouped.filter(g => {
        const template = getCredentialTemplate(g.serviceType);
        return template && template.events.length > 0;
      }));
    } catch (error) {
      console.error('Failed to fetch events data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleEvent = async (event: DbCredentialEvent) => {
    try {
      await fetch(`/api/personas/credential-events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !event.enabled }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle event:', error);
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-amber-400/60" />
          </div>
          <p className="text-sm text-muted-foreground/60">No event sources</p>
          <p className="text-xs text-muted-foreground/40 mt-1">Add credentials with event support (Gmail, Slack, GitHub)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 space-y-4">
      <h3 className="text-sm font-mono text-muted-foreground/50 uppercase tracking-wider">Event Sources</h3>

      <div className="space-y-2">
        {groups.map((group) => {
          const template = getCredentialTemplate(group.serviceType);
          const isExpanded = expandedGroups.has(group.credentialId);
          const enabledCount = group.events.filter(e => e.enabled).length;

          return (
            <div
              key={group.credentialId}
              className="bg-secondary/40 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden"
            >
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.credentialId)}
                className="w-full flex items-center gap-3 p-4 hover:bg-secondary/60 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${template?.color}20`, borderColor: `${template?.color}40`, borderWidth: 1 }}
                >
                  <Zap className="w-4 h-4" style={{ color: template?.color }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-foreground/90">{group.credentialName}</div>
                  <div className="text-[11px] text-muted-foreground/50">{template?.label} - {enabledCount} active</div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground/40" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                )}
              </button>

              {/* Events */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/20"
                  >
                    <div className="p-3 space-y-2">
                      {group.events.length === 0 && template?.events.map(tmplEvent => (
                        <div key={tmplEvent.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/30">
                          <Zap className="w-4 h-4 text-muted-foreground/30" />
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground/60">{tmplEvent.name}</div>
                            <div className="text-xs text-muted-foreground/40">{tmplEvent.description}</div>
                          </div>
                          <span className="text-xs text-muted-foreground/30">Not configured</span>
                        </div>
                      ))}

                      {group.events.map((event) => (
                        <div
                          key={event.id}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                            event.enabled ? 'bg-primary/5 border border-primary/10' : 'bg-background/30'
                          }`}
                        >
                          <Zap className={`w-4 h-4 ${event.enabled ? 'text-primary' : 'text-muted-foreground/30'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-foreground/80">{event.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock className="w-3 h-3 text-muted-foreground/40" />
                              <span className="text-[11px] text-muted-foreground/40">
                                Last polled: {formatTimestamp(event.last_polled_at)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleEvent(event)}
                            className="p-1.5 hover:bg-secondary/60 rounded-lg transition-colors"
                          >
                            {event.enabled ? (
                              <ToggleRight className="w-5 h-5 text-primary" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
