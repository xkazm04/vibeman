/**
 * BalancingPanel — Pipeline configuration controls
 *
 * Allows user to override default balancing: scan types, triage thresholds,
 * model routing, batch size, concurrency, and budget controls.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings2, ChevronDown, ChevronRight, RotateCcw,
  Search, Filter, Layers, Zap, Brain, Activity,
  Check, X,
} from 'lucide-react';
import { useConductorStore } from '../../lib/conductor/conductorStore';
import type { BalancingConfig, ScanStrategy, BatchStrategy, ModelRoutingRule } from '../../lib/conductor/types';
import type { CLIProvider } from '@/lib/claude-terminal/types';
import { PROVIDER_MODELS } from '@/lib/claude-terminal/types';

interface SectionProps {
  title: string;
  icon: typeof Settings2;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-800/50 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800/30 transition-colors"
      >
        <Icon className="w-3.5 h-3.5 text-gray-500" />
        <span className="font-medium flex-1 text-left">{title}</span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
  valueColor = 'text-cyan-400',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  valueColor?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-mono font-bold ${valueColor}`}>
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none bg-gray-700 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-cyan-400/30"
      />
    </div>
  );
}

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-2 py-1.5 text-[11px] font-medium transition-all
              ${value === opt.value
                ? 'bg-cyan-600/30 text-cyan-300 border-cyan-600/50'
                : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700/50'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const PROVIDERS: CLIProvider[] = ['claude', 'gemini', 'copilot', 'ollama'];

const CONDITION_LABELS: Record<ModelRoutingRule['condition'], string> = {
  complexity_1: 'Low (1-3)',
  complexity_2: 'Medium (4-6)',
  complexity_3: 'High (7-10)',
  default: 'Default',
};

function ModelRoutingRow({
  rule,
  disabled,
  onChange,
}: {
  rule: ModelRoutingRule;
  disabled: boolean;
  onChange: (rule: ModelRoutingRule) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editProvider, setEditProvider] = useState<CLIProvider>(rule.provider);
  const [editModel, setEditModel] = useState(rule.model);

  const models = PROVIDER_MODELS[editProvider] || [];

  const handleSave = () => {
    onChange({ ...rule, provider: editProvider, model: editModel });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditProvider(rule.provider);
    setEditModel(rule.model);
    setEditing(false);
  };

  const handleProviderChange = (p: CLIProvider) => {
    setEditProvider(p);
    const firstModel = PROVIDER_MODELS[p]?.[0]?.id;
    if (firstModel) setEditModel(firstModel);
  };

  if (editing && !disabled) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] p-1.5 rounded-lg bg-gray-800/60 border border-cyan-800/40">
        <span className="text-gray-500 w-16 truncate text-[10px]">
          {CONDITION_LABELS[rule.condition]}
        </span>
        <span className="text-gray-600">&rarr;</span>
        <select
          value={editProvider}
          onChange={(e) => handleProviderChange(e.target.value as CLIProvider)}
          className="bg-gray-700 text-gray-200 text-[10px] rounded px-1 py-0.5 border border-gray-600 outline-none focus:border-cyan-600"
        >
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className="text-gray-600">/</span>
        <select
          value={editModel}
          onChange={(e) => setEditModel(e.target.value)}
          className="bg-gray-700 text-gray-200 text-[10px] rounded px-1 py-0.5 border border-gray-600 outline-none focus:border-cyan-600 max-w-[100px]"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <button onClick={handleSave} className="text-emerald-400 hover:text-emerald-300 ml-auto">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={handleCancel} className="text-gray-500 hover:text-gray-300">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className="flex items-center gap-2 text-[11px] w-full p-1.5 rounded-lg hover:bg-gray-800/40
        transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50 group"
      data-testid={`routing-row-${rule.condition}`}
    >
      <span className="text-gray-500 w-16 truncate text-[10px]">
        {CONDITION_LABELS[rule.condition]}
      </span>
      <span className="text-gray-600">&rarr;</span>
      <span className="text-cyan-400 font-mono">
        {rule.provider}/{rule.model}
      </span>
      <span className="text-gray-700 text-[9px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
        click to edit
      </span>
    </button>
  );
}

interface UsageData {
  provider: string;
  label: string;
  used?: number;
  limit?: number;
  unit: string;
  color: string;
}

function SubscriptionUsage() {
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    const data: UsageData[] = [];

    // Claude: fetch rate-limit info from a lightweight API probe
    try {
      const res = await fetch('/api/conductor/usage?provider=claude');
      if (res.ok) {
        const d = await res.json();
        if (d.claude) {
          data.push({
            provider: 'claude',
            label: 'Claude',
            used: d.claude.used,
            limit: d.claude.limit,
            unit: d.claude.unit || 'req/min',
            color: 'text-orange-400',
          });
        }
      }
    } catch { /* silent */ }

    // Copilot: fetch premium request usage
    try {
      const res = await fetch('/api/conductor/usage?provider=copilot');
      if (res.ok) {
        const d = await res.json();
        if (d.copilot) {
          data.push({
            provider: 'copilot',
            label: 'Copilot',
            used: d.copilot.used,
            limit: d.copilot.limit,
            unit: d.copilot.unit || 'req/mo',
            color: 'text-blue-400',
          });
        }
      }
    } catch { /* silent */ }

    // Gemini: local tracking only (no API)
    try {
      const res = await fetch('/api/conductor/usage?provider=gemini');
      if (res.ok) {
        const d = await res.json();
        if (d.gemini) {
          data.push({
            provider: 'gemini',
            label: 'Gemini',
            used: d.gemini.used,
            limit: d.gemini.limit,
            unit: d.gemini.unit || 'req/day',
            color: 'text-emerald-400',
          });
        }
      }
    } catch { /* silent */ }

    setUsage(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchUsage]);

  if (usage.length === 0 && !loading) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-gray-600" />
          <span className="text-xs text-gray-500">Usage</span>
        </div>
        <p className="text-[10px] text-gray-600 italic">
          No usage data available — configure API keys for tracking
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-testid="subscription-usage">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3 text-gray-500" />
        <span className="text-xs text-gray-400">Usage</span>
        {loading && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
      </div>
      <div className="space-y-1">
        {usage.map((u) => (
          <div key={u.provider} className="flex items-center gap-2 text-[10px]">
            <span className={`font-medium w-14 ${u.color}`}>{u.label}</span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  u.limit && u.used && (u.used / u.limit) > 0.8
                    ? 'bg-red-500'
                    : u.limit && u.used && (u.used / u.limit) > 0.5
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${u.limit ? Math.min(100, ((u.used || 0) / u.limit) * 100) : 0}%` }}
              />
            </div>
            <span className="text-gray-500 font-mono w-20 text-right">
              {u.used ?? '?'}/{u.limit ?? '?'} <span className="text-gray-600">{u.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BalancingPanel() {
  const { config, updateConfig, resetConfig, isRunning } = useConductorStore();

  const update = (partial: Partial<BalancingConfig>) => {
    if (isRunning) return; // Prevent config changes while running
    updateConfig(partial);
  };

  return (
    <motion.div
      className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      data-testid="balancing-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Balancing</span>
        </div>
        <button
          onClick={resetConfig}
          disabled={isRunning}
          className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors disabled:opacity-30"
          title="Reset to defaults"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Sections */}
      <div className="max-h-[400px] overflow-y-auto">
        {/* Scout Configuration */}
        <CollapsibleSection title="Scout" icon={Search} defaultOpen>
          <ToggleGroup<ScanStrategy>
            label="Scan Strategy"
            options={[
              { value: 'rotate', label: 'Rotate' },
              { value: 'weighted', label: 'Weighted' },
              { value: 'brain-driven', label: 'Brain' },
            ]}
            value={config.scanStrategy}
            onChange={(v) => update({ scanStrategy: v })}
          />
          <SliderControl
            label="Max Ideas per Cycle"
            value={config.maxIdeasPerCycle}
            min={1}
            max={30}
            onChange={(v) => update({ maxIdeasPerCycle: v })}
          />
        </CollapsibleSection>

        {/* Triage Configuration */}
        <CollapsibleSection title="Triage" icon={Filter}>
          <SliderControl
            label="Min Impact"
            value={config.minImpact}
            min={1}
            max={10}
            onChange={(v) => update({ minImpact: v })}
            valueColor={config.minImpact >= 7 ? 'text-emerald-400' : config.minImpact >= 4 ? 'text-amber-400' : 'text-red-400'}
          />
          <SliderControl
            label="Max Effort"
            value={config.maxEffort}
            min={1}
            max={10}
            onChange={(v) => update({ maxEffort: v })}
            valueColor={config.maxEffort <= 4 ? 'text-emerald-400' : config.maxEffort <= 7 ? 'text-amber-400' : 'text-red-400'}
          />
          <SliderControl
            label="Max Risk"
            value={config.maxRisk}
            min={1}
            max={10}
            onChange={(v) => update({ maxRisk: v })}
            valueColor={config.maxRisk <= 4 ? 'text-emerald-400' : config.maxRisk <= 6 ? 'text-amber-400' : 'text-red-400'}
          />
          <SliderControl
            label="Auto-Triage Confidence"
            value={config.autoTriageThreshold}
            min={0.1}
            max={1.0}
            step={0.1}
            onChange={(v) => update({ autoTriageThreshold: v })}
            suffix=""
          />
        </CollapsibleSection>

        {/* Batch Configuration */}
        <CollapsibleSection title="Batch" icon={Layers}>
          <ToggleGroup<BatchStrategy>
            label="Batch Strategy"
            options={[
              { value: 'sequential', label: 'Sequential' },
              { value: 'parallel', label: 'Parallel' },
              { value: 'dag', label: 'DAG' },
            ]}
            value={config.batchStrategy}
            onChange={(v) => update({ batchStrategy: v })}
          />
          <SliderControl
            label="Max Batch Size"
            value={config.maxBatchSize}
            min={1}
            max={15}
            onChange={(v) => update({ maxBatchSize: v })}
          />
          <SliderControl
            label="Max Concurrent Tasks"
            value={config.maxConcurrentTasks}
            min={1}
            max={4}
            onChange={(v) => update({ maxConcurrentTasks: v })}
          />
        </CollapsibleSection>

        {/* Execute / Model Routing */}
        <CollapsibleSection title="Execution" icon={Zap}>
          <div className="grid grid-cols-1 gap-3">
            {/* Model Routing Table */}
            <div className="space-y-2">
              <span className="text-xs text-gray-400">Model Routing</span>
              <div className="space-y-1">
                {config.modelRouting.map((rule, idx) => (
                  <ModelRoutingRow
                    key={idx}
                    rule={rule}
                    disabled={isRunning}
                    onChange={(updated) => {
                      const newRouting = [...config.modelRouting];
                      newRouting[idx] = updated;
                      update({ modelRouting: newRouting });
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Subscription Usage */}
            <SubscriptionUsage />
          </div>
        </CollapsibleSection>

        {/* Budget Controls */}
        <CollapsibleSection title="Budget" icon={Brain}>
          <SliderControl
            label="Max Cycles per Run"
            value={config.maxCyclesPerRun}
            min={1}
            max={10}
            onChange={(v) => update({ maxCyclesPerRun: v })}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Quota Limits</span>
            <button
              onClick={() => update({
                quotaLimits: {
                  ...config.quotaLimits,
                  enabled: !config.quotaLimits.enabled,
                },
              })}
              className={`w-8 h-4 rounded-full transition-colors relative ${
                config.quotaLimits.enabled ? 'bg-cyan-600' : 'bg-gray-700'
              }`}
            >
              <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                config.quotaLimits.enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          {config.quotaLimits.enabled && (
            <>
              <SliderControl
                label="Max API Calls/Hour"
                value={config.quotaLimits.maxApiCallsPerHour}
                min={10}
                max={500}
                step={10}
                onChange={(v) => update({
                  quotaLimits: { ...config.quotaLimits, maxApiCallsPerHour: v },
                })}
              />
            </>
          )}
        </CollapsibleSection>
      </div>

      {/* Disabled overlay when running */}
      {isRunning && (
        <div className="absolute inset-0 bg-gray-900/40 rounded-xl flex items-center justify-center pointer-events-none">
          <span className="text-xs text-gray-500">Locked while running</span>
        </div>
      )}
    </motion.div>
  );
}
