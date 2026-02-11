'use client';

import React, { useMemo } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { Clock, Webhook, Play, ChevronRight } from 'lucide-react';
import { DbPersonaTrigger } from '@/app/features/Personas/lib/types';
import { motion } from 'framer-motion';

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

interface TriggerListProps {
  onNavigateToPersona?: (personaId: string) => void;
}

export function TriggerList({ onNavigateToPersona }: TriggerListProps) {
  const personas = usePersonaStore((state) => state.personas);
  const [allTriggers, setAllTriggers] = React.useState<Record<string, DbPersonaTrigger[]>>({});

  React.useEffect(() => {
    const fetchAllTriggers = async () => {
      const triggersMap: Record<string, DbPersonaTrigger[]> = {};

      for (const persona of personas) {
        try {
          const response = await fetch(`/api/personas/${persona.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.persona?.triggers) {
              triggersMap[persona.id] = data.persona.triggers;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch triggers for persona ${persona.id}:`, error);
        }
      }

      setAllTriggers(triggersMap);
    };

    if (personas.length > 0) {
      fetchAllTriggers();
    }
  }, [personas]);

  const groupedTriggers = useMemo(() => {
    const groups: Record<string, { persona: typeof personas[0]; triggers: DbPersonaTrigger[] }> = {};

    personas.forEach((persona) => {
      const personaTriggers = allTriggers[persona.id] || [];
      if (personaTriggers.length > 0) {
        groups[persona.id] = { persona, triggers: personaTriggers };
      }
    });

    return groups;
  }, [personas, allTriggers]);

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const calculateNextTrigger = (trigger: DbPersonaTrigger) => {
    if (!trigger.enabled) return 'Disabled';
    if (trigger.trigger_type === 'manual') return 'Manual only';
    if (trigger.trigger_type === 'webhook') return 'On webhook';

    if (trigger.last_triggered_at && trigger.config) {
      const config = typeof trigger.config === 'string' ? JSON.parse(trigger.config) : trigger.config;
      if (config.interval_seconds) {
        const lastTrigger = new Date(trigger.last_triggered_at);
        const nextTrigger = new Date(lastTrigger.getTime() + config.interval_seconds * 1000);
        return nextTrigger.toLocaleString();
      }
    }

    return 'Pending';
  };

  return (
    <div className="h-full p-6 space-y-6">
      <h3 className="text-sm font-mono text-muted-foreground/50 uppercase tracking-wider">Event Triggers</h3>

      {Object.values(groupedTriggers).map(({ persona, triggers }) => (
        <div key={persona.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground/80">{persona.name}</h4>
            {onNavigateToPersona && (
              <button
                onClick={() => onNavigateToPersona(persona.id)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                Configure
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {triggers.map((trigger) => {
              const Icon = TRIGGER_TYPE_ICONS[trigger.trigger_type];
              const colorClass = TRIGGER_TYPE_COLORS[trigger.trigger_type];

              return (
                <motion.div
                  key={trigger.id}
                  whileHover={{ x: 4 }}
                  onClick={() => onNavigateToPersona?.(persona.id)}
                  className="p-3 bg-secondary/40 backdrop-blur-sm border border-border/30 rounded-xl cursor-pointer hover:border-primary/20 transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className={`w-4 h-4 mt-0.5 ${colorClass}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium capitalize ${colorClass}`}>
                          {trigger.trigger_type}
                        </span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono ${
                          trigger.enabled
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-secondary/60 text-muted-foreground/40 border border-border/20'
                        }`}>
                          {trigger.enabled ? 'On' : 'Off'}
                        </span>
                      </div>

                      <div className="mt-1.5 text-xs text-muted-foreground/40 space-y-0.5">
                        <div>Last: {formatTimestamp(trigger.last_triggered_at)}</div>
                        <div>Next: {calculateNextTrigger(trigger)}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(groupedTriggers).length === 0 && (
        <div className="text-center py-10 text-muted-foreground/40 text-sm">
          No triggers configured yet
        </div>
      )}
    </div>
  );
}
