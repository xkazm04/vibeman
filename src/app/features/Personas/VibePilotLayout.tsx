'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import type { DbPersona } from '@/app/db/models/persona.types';

/** Names of the seeded Vibeman personas (must match seed-personas route) */
const VIBEMAN_PERSONA_NAMES = [
  'Idea Evaluator',
  'Brain Reflector',
  'Smart Scheduler',
  'Direction Critic',
  'Quality Verifier',
  'Annette Voice Bridge',
];

interface SchedulerStatus {
  isRunning: boolean;
  consecutiveEmptyPolls?: number;
  currentInterval?: number;
  pendingEvents?: number;
}

// ── Toggle Switch ───────────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  loading,
  onChange,
  color,
}: {
  enabled: boolean;
  loading: boolean;
  onChange: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        enabled ? '' : 'bg-gray-700'
      }`}
      style={enabled ? { backgroundColor: color } : undefined}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
      {loading && (
        <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-white" />
      )}
    </button>
  );
}

// ── Persona Card ────────────────────────────────────────────────────────────

function PersonaToggleCard({
  persona,
  onToggle,
}: {
  persona: DbPersona;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const isEnabled = persona.enabled === 1;

  const handleToggle = async () => {
    setLoading(true);
    try {
      await onToggle(persona.id, !isEnabled);
    } finally {
      setLoading(false);
    }
  };

  const borderColor = isEnabled ? (persona.color || '#6366f1') : '#374151';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-xl border bg-gray-900/60 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-gray-900/80"
      style={{ borderColor, borderWidth: '1.5px' }}
    >
      {/* Header row: icon + name + toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">{persona.icon || '🤖'}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-white truncate">{persona.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{persona.description}</p>
          </div>
        </div>
        <ToggleSwitch
          enabled={isEnabled}
          loading={loading}
          onChange={handleToggle}
          color={persona.color || '#6366f1'}
        />
      </div>

      {/* Status pill */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isEnabled
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-gray-800 text-gray-500'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isEnabled ? 'bg-emerald-400' : 'bg-gray-600'}`} />
          {isEnabled ? 'Active' : 'Disabled'}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main Layout ─────────────────────────────────────────────────────────────

export default function VibePilotLayout() {
  const personas = usePersonaStore((s) => s.personas);
  const fetchPersonas = usePersonaStore((s) => s.fetchPersonas);
  const updatePersona = usePersonaStore((s) => s.updatePersona);

  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Auto-start scheduler + fetch status on mount
  useEffect(() => {
    fetchPersonas();

    fetch('/api/personas/scheduler')
      .then(r => r.json())
      .then(data => {
        if (data.scheduler) setSchedulerStatus(data.scheduler);
      })
      .catch(() => {});
  }, [fetchPersonas]);

  // Filter to Vibeman personas only
  const vibermanPersonas = personas.filter(p => VIBEMAN_PERSONA_NAMES.includes(p.name));

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    await updatePersona(id, { enabled });
  }, [updatePersona]);

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const res = await fetch('/api/personas/seed-personas', { method: 'POST' });
      const data = await res.json();
      setSeedMessage(data.message || 'Personas seeded');
      await fetchPersonas();
    } catch (err) {
      setSeedMessage(err instanceof Error ? err.message : 'Failed to seed');
    } finally {
      setSeeding(false);
    }
  }, [fetchPersonas]);

  const handleRefresh = useCallback(async () => {
    await fetchPersonas();
    try {
      const res = await fetch('/api/personas/scheduler');
      const data = await res.json();
      if (data.scheduler) setSchedulerStatus(data.scheduler);
    } catch {}
  }, [fetchPersonas]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground overflow-auto">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/80 pointer-events-none" />
      <div className="absolute top-0 right-0 w-1/3 h-1/2 bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <h1 className="text-2xl font-semibold text-white tracking-tight">VibePilot</h1>
            </div>
            <p className="text-sm text-gray-400 max-w-md">
              Autonomous agents for the Vibeman intelligence pipeline. Toggle personas on/off to control the automated quality loop.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Scheduler status badge */}
            {schedulerStatus && (
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                schedulerStatus.isRunning
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  schedulerStatus.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`} />
                Scheduler {schedulerStatus.isRunning ? 'Running' : 'Stopped'}
              </div>
            )}
          </div>
        </div>

        {/* No personas — seed prompt */}
        {vibermanPersonas.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-8 rounded-xl border border-dashed border-gray-700 bg-gray-900/30"
          >
            <Sparkles className="w-10 h-10 text-purple-400/50 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-white mb-2">No Vibeman personas found</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Seed the 6 intelligence pipeline personas to get started.
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {seeding ? 'Seeding...' : 'Seed Personas'}
            </button>
            {seedMessage && (
              <p className="mt-3 text-xs text-gray-400">{seedMessage}</p>
            )}
          </motion.div>
        )}

        {/* Persona grid */}
        {vibermanPersonas.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vibermanPersonas.map((persona) => (
              <PersonaToggleCard
                key={persona.id}
                persona={persona}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}

        {/* Stats summary */}
        {vibermanPersonas.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
            <span>
              {vibermanPersonas.filter(p => p.enabled === 1).length} of {vibermanPersonas.length} personas active
            </span>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              {seeding ? 'Seeding...' : 'Re-seed missing personas'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
