'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { transition } from '@/lib/motion';
import {
  Bell, BellOff, Plus, Trash2, Check, Clock,
  AlertTriangle, Eye, EyeOff, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useApplicationSession } from '@/lib/session';
import {
  useMonitors,
  useCreateMonitor,
  useDeleteMonitor,
  useUpdateMonitorEvent,
  useEvaluateMonitors,
} from '../lib/queries/useBrainQueries';
import type { MonitorMetric, MonitorCondition, DbAnomalyMonitorEvent } from '@/app/db/models/brain.types';

const METRIC_LABELS: Record<MonitorMetric, string> = {
  signal_z_score: 'Signal Z-Score',
  success_rate: 'Success Rate',
  failure_rate: 'Failure Rate',
  activity_count: 'Activity Count',
  decay_weighted_activity: 'Decay-Weighted Activity',
};

const CONDITION_LABELS: Record<MonitorCondition, string> = {
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  abs_gt: '|x| >',
};

const SEVERITY_STYLES = {
  critical: 'text-red-400 border-red-500/30 bg-red-500/5',
  warning: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
  info: 'text-zinc-400 border-zinc-700/30 bg-zinc-700/5',
} as const;

interface MonitorPanelProps {
  scope: 'project' | 'global';
  compact?: boolean;
}

export default function MonitorPanel({ scope, compact }: MonitorPanelProps) {
  const { activeProject: sessionProject } = useApplicationSession();
  const legacyProject = useClientProjectStore((s) => s.activeProject);
  const activeProject = sessionProject ?? legacyProject;
  const projectId = scope === 'global' ? undefined : activeProject?.id;

  const { data, isLoading } = useMonitors(projectId);
  const createMutation = useCreateMonitor(projectId);
  const deleteMutation = useDeleteMonitor(projectId);
  const eventMutation = useUpdateMonitorEvent(projectId);
  const evaluateMutation = useEvaluateMonitors(projectId);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedMonitors, setExpandedMonitors] = useState(false);

  const monitors = data?.monitors ?? [];
  const activeEvents = data?.activeEvents ?? [];
  const triggeredEvents = activeEvents.filter(e => e.status === 'triggered');
  const snoozedEvents = activeEvents.filter(e => e.status === 'snoozed');

  const handleAcknowledge = useCallback((eventId: string) => {
    eventMutation.mutate({ eventId, status: 'acknowledged' });
  }, [eventMutation]);

  const handleSnooze = useCallback((eventId: string, minutes = 60) => {
    eventMutation.mutate({ eventId, status: 'snoozed', snoozeDurationMinutes: minutes });
  }, [eventMutation]);

  const handleResolve = useCallback((eventId: string) => {
    eventMutation.mutate({ eventId, status: 'resolved' });
  }, [eventMutation]);

  const handleEvaluate = useCallback(() => {
    evaluateMutation.mutate();
  }, [evaluateMutation]);

  if (!projectId) {
    return (
      <div className="border border-zinc-800/50 rounded-sm p-3 font-mono">
        <div className="flex items-center gap-2 text-zinc-600 text-2xs">
          <Bell className="w-3 h-3" />
          <span>monitors unavailable in global mode</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800/50 rounded-sm font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/30">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs text-zinc-300">Monitors</span>
          {triggeredEvents.length > 0 && (
            <span className="text-2xs text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded-sm">
              {triggeredEvents.length} alert{triggeredEvents.length !== 1 ? 's' : ''}
            </span>
          )}
          {snoozedEvents.length > 0 && (
            <span className="text-2xs text-zinc-500 bg-zinc-800/50 border border-zinc-700/30 px-1.5 py-0.5 rounded-sm">
              {snoozedEvents.length} snoozed
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleEvaluate}
            disabled={evaluateMutation.isPending}
            className="text-2xs text-zinc-500 hover:text-cyan-400 transition-colors px-1.5 py-0.5 border border-zinc-800/50 rounded-sm disabled:opacity-50"
            title="Evaluate all monitors now"
          >
            {evaluateMutation.isPending ? 'checking...' : 'check now'}
          </button>
          <button
            onClick={() => setShowCreateForm(f => !f)}
            className="text-zinc-500 hover:text-cyan-400 transition-colors"
            title="Add monitor"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition.snappy}
            className="overflow-hidden"
          >
            <CreateMonitorForm
              projectId={projectId}
              onCreate={(input) => {
                createMutation.mutate(input, { onSuccess: () => setShowCreateForm(false) });
              }}
              isCreating={createMutation.isPending}
              onCancel={() => setShowCreateForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Triggered Events */}
      {triggeredEvents.length > 0 && (
        <div className="px-3 py-2 space-y-1.5 border-b border-zinc-800/30">
          {triggeredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onAcknowledge={handleAcknowledge}
              onSnooze={handleSnooze}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}

      {/* Snoozed Events (collapsed) */}
      {snoozedEvents.length > 0 && (
        <div className="px-3 py-1.5 border-b border-zinc-800/30">
          <div className="text-2xs text-zinc-600 flex items-center gap-1">
            <BellOff className="w-3 h-3" />
            {snoozedEvents.length} snoozed alert{snoozedEvents.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Empty state */}
      {triggeredEvents.length === 0 && snoozedEvents.length === 0 && monitors.length > 0 && (
        <div className="px-3 py-3 text-center">
          <span className="text-2xs text-zinc-600">all clear - no triggered alerts</span>
        </div>
      )}

      {/* Monitor list (collapsible) */}
      {!compact && monitors.length > 0 && (
        <div className="px-3 py-1.5">
          <button
            onClick={() => setExpandedMonitors(e => !e)}
            className="flex items-center gap-1 text-2xs text-zinc-600 hover:text-zinc-400 transition-colors w-full"
          >
            {expandedMonitors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{monitors.length} monitor{monitors.length !== 1 ? 's' : ''} configured</span>
          </button>
          <AnimatePresence>
            {expandedMonitors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={transition.snappy}
                className="overflow-hidden mt-1.5 space-y-1"
              >
                {monitors.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-2xs py-1 px-1.5 border border-zinc-800/30 rounded-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {m.enabled ? (
                        <Eye className="w-3 h-3 text-green-500/60 flex-shrink-0" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-zinc-700 flex-shrink-0" />
                      )}
                      <span className={`truncate ${m.enabled ? 'text-zinc-400' : 'text-zinc-600'}`}>{m.name}</span>
                      <span className="text-zinc-700 flex-shrink-0">
                        {CONDITION_LABELS[m.condition as MonitorCondition]} {m.threshold}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(m.id)}
                      className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0 ml-1"
                      title="Delete monitor"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* No monitors at all */}
      {monitors.length === 0 && !isLoading && (
        <div className="px-3 py-4 text-center">
          <p className="text-2xs text-zinc-600">no monitors configured</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-2xs text-cyan-500/60 hover:text-cyan-400 mt-1 transition-colors"
          >
            + create your first monitor
          </button>
        </div>
      )}
    </div>
  );
}

// ── Event Card ──────────────────────────────────────────────────────────────

function EventCard({
  event,
  onAcknowledge,
  onSnooze,
  onResolve,
}: {
  event: DbAnomalyMonitorEvent;
  onAcknowledge: (id: string) => void;
  onSnooze: (id: string, minutes?: number) => void;
  onResolve: (id: string) => void;
}) {
  const styles = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info;

  return (
    <div className={`border rounded-sm px-2.5 py-2 ${styles}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span className="text-2xs font-medium truncate">{event.message}</span>
          </div>
          <div className="text-2xs text-zinc-600 mt-0.5">
            value: {event.current_value.toFixed(2)} / threshold: {event.threshold_value}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onAcknowledge(event.id)}
            className="p-0.5 text-zinc-600 hover:text-green-400 transition-colors"
            title="Acknowledge"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => onSnooze(event.id, 60)}
            className="p-0.5 text-zinc-600 hover:text-amber-400 transition-colors"
            title="Snooze 1h"
          >
            <Clock className="w-3 h-3" />
          </button>
          <button
            onClick={() => onResolve(event.id)}
            className="p-0.5 text-zinc-600 hover:text-cyan-400 transition-colors"
            title="Resolve"
          >
            <BellOff className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Monitor Form ─────────────────────────────────────────────────────

function CreateMonitorForm({
  projectId,
  onCreate,
  isCreating,
  onCancel,
}: {
  projectId: string;
  onCreate: (input: Parameters<ReturnType<typeof useCreateMonitor>['mutate']>[0]) => void;
  isCreating: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<MonitorMetric>('signal_z_score');
  const [condition, setCondition] = useState<MonitorCondition>('abs_gt');
  const [threshold, setThreshold] = useState('2');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(threshold);
    if (!name.trim() || isNaN(t)) return;
    onCreate({
      projectId,
      name: name.trim(),
      metric,
      condition,
      threshold: t,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2 space-y-2 border-b border-zinc-800/30 bg-zinc-900/30">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Monitor name..."
        className="w-full bg-zinc-900/80 border border-zinc-800/50 rounded-sm px-2 py-1 text-2xs text-zinc-300 placeholder:text-zinc-700 focus:border-cyan-500/40 focus:outline-none"
      />
      <div className="flex gap-2">
        <select
          value={metric}
          onChange={e => setMetric(e.target.value as MonitorMetric)}
          className="flex-1 bg-zinc-900/80 border border-zinc-800/50 rounded-sm px-1.5 py-1 text-2xs text-zinc-400 focus:border-cyan-500/40 focus:outline-none"
        >
          {Object.entries(METRIC_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={condition}
          onChange={e => setCondition(e.target.value as MonitorCondition)}
          className="w-16 bg-zinc-900/80 border border-zinc-800/50 rounded-sm px-1.5 py-1 text-2xs text-zinc-400 focus:border-cyan-500/40 focus:outline-none"
        >
          {Object.entries(CONDITION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.1"
          value={threshold}
          onChange={e => setThreshold(e.target.value)}
          className="w-16 bg-zinc-900/80 border border-zinc-800/50 rounded-sm px-1.5 py-1 text-2xs text-zinc-400 focus:border-cyan-500/40 focus:outline-none"
        />
      </div>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="text-2xs text-zinc-600 hover:text-zinc-400 px-2 py-0.5 border border-zinc-800/50 rounded-sm transition-colors"
        >
          cancel
        </button>
        <button
          type="submit"
          disabled={isCreating || !name.trim()}
          className="text-2xs text-cyan-400 hover:text-cyan-300 px-2 py-0.5 border border-cyan-500/30 rounded-sm transition-colors disabled:opacity-50"
        >
          {isCreating ? 'creating...' : 'create'}
        </button>
      </div>
    </form>
  );
}
