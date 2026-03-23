/**
 * BalancingView — Unified pipeline configuration content.
 *
 * Renders in two layouts:
 * - "modal": grid-based sections for the BalancingModal (UniversalModal wrapper)
 * - "inline": collapsible sections for sidebar/panel embedding
 *
 * All shared primitives come from components/ui/.
 */

'use client';

import type { ComponentType } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { transition } from '@/lib/motion';
import {
  ChevronDown, ChevronRight,
  Search, Filter, Layers, Zap, Brain, Activity,
  Sparkles, DollarSign, GitBranch,
} from 'lucide-react';
import SliderControl from '@/components/ui/SliderControl';
import Toggle from '@/components/ui/Toggle';
import ToggleGroup from '@/components/ui/ToggleGroup';
import { useConductorStore } from '../lib/conductorStore';
import type { BalancingConfig, ScanStrategy, BatchStrategy, ModelRoutingRule } from '../lib/types';
import type { CLIProvider } from '@/lib/claude-terminal/types';
import { PROVIDER_MODELS } from '@/lib/claude-terminal/types';

// ============================================================================
// Shared sub-components
// ============================================================================

const PROVIDERS: CLIProvider[] = ['claude', 'gemini', 'copilot', 'ollama'];

const selectClass =
  'bg-gray-800 text-gray-200 text-caption rounded-md px-1.5 py-1 border border-gray-700 outline-none focus:border-cyan-600 transition-colors cursor-pointer w-full';

function SectionHeader({
  icon: Icon,
  label,
  colorClass,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800/50">
      <Icon className={`w-4 h-4 ${colorClass}`} />
      <span className={`text-sm font-semibold ${colorClass}`}>{label}</span>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
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
            transition={transition.normal}
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

// ============================================================================
// Model Routing (shared)
// ============================================================================

const TIER_META: { condition: ModelRoutingRule['condition']; label: string; color: string }[] = [
  { condition: 'complexity_1', label: 'Effort 1-3', color: 'text-emerald-400' },
  { condition: 'complexity_2', label: 'Effort 4-6', color: 'text-amber-400' },
  { condition: 'complexity_3', label: 'Effort 7+', color: 'text-red-400' },
];

function ComplexityRoutingTable({
  routing,
  onChange,
  disabled = false,
}: {
  routing: ModelRoutingRule[];
  onChange: (routing: ModelRoutingRule[]) => void;
  disabled?: boolean;
}) {
  const handleRuleChange = (condition: ModelRoutingRule['condition'], provider: CLIProvider, model: string) => {
    const newRouting = routing.map((r) =>
      r.condition === condition ? { ...r, provider, model } : r,
    );
    onChange(newRouting);
  };

  return (
    <div className="space-y-1.5">
      {TIER_META.map((tier) => {
        const rule = routing.find((r) => r.condition === tier.condition);
        if (!rule) return null;
        const models = PROVIDER_MODELS[rule.provider] || [];
        return (
          <div
            key={tier.condition}
            className={`flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-gray-800/30 transition-colors ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            data-testid={`routing-row-${tier.condition}`}
          >
            <span className={`text-caption font-mono font-bold w-[52px] flex-shrink-0 ${tier.color}`}>
              {tier.label}
            </span>
            <select
              value={rule.provider}
              onChange={(e) => {
                const newProvider = e.target.value as CLIProvider;
                const firstModel = PROVIDER_MODELS[newProvider]?.[0]?.id || '';
                handleRuleChange(tier.condition, newProvider, firstModel);
              }}
              className={selectClass}
              disabled={disabled}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={rule.model}
              onChange={(e) => handleRuleChange(tier.condition, rule.provider, e.target.value)}
              className={selectClass}
              disabled={disabled}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function ProviderModelSelect({
  provider,
  model,
  onProviderChange,
  onModelChange,
}: {
  provider: CLIProvider;
  model: string | null;
  onProviderChange: (p: CLIProvider) => void;
  onModelChange: (m: string | null) => void;
}) {
  const models = PROVIDER_MODELS[provider] || [];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <select
        value={provider}
        onChange={(e) => {
          const newP = e.target.value as CLIProvider;
          onProviderChange(newP);
          const firstModel = PROVIDER_MODELS[newP]?.[0]?.id || '';
          onModelChange(firstModel);
        }}
        className={selectClass}
      >
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      <select
        value={model || ''}
        onChange={(e) => onModelChange(e.target.value || null)}
        className={selectClass}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// Subscription Usage (from the old panel)
// ============================================================================

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

    for (const [provider, label, color, unit] of [
      ['claude', 'Claude', 'text-orange-400', 'req/min'],
      ['copilot', 'Copilot', 'text-blue-400', 'req/mo'],
      ['gemini', 'Gemini', 'text-emerald-400', 'req/day'],
    ] as const) {
      try {
        const res = await fetch(`/api/conductor/usage?provider=${provider}`);
        if (res.ok) {
          const d = await res.json();
          if (d[provider]) {
            data.push({
              provider,
              label,
              used: d[provider].used,
              limit: d[provider].limit,
              unit: d[provider].unit || unit,
              color,
            });
          }
        }
      } catch { /* silent */ }
    }

    setUsage(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60_000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  if (usage.length === 0 && !loading) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-gray-600" />
          <span className="text-xs text-gray-500">Usage</span>
        </div>
        <p className="text-2xs text-gray-600 italic">
          No usage data available
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
          <div key={u.provider} className="flex items-center gap-2 text-2xs">
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

// ============================================================================
// BalancingView — the unified content
// ============================================================================

interface BalancingViewProps {
  /** "modal" = grid sections (for UniversalModal); "inline" = collapsible sidebar */
  layout: 'modal' | 'inline';
}

export default function BalancingView({ layout }: BalancingViewProps) {
  const { config, updateConfig, isRunning } = useConductorStore();

  const update = (partial: Partial<BalancingConfig>) => {
    if (layout === 'inline' && isRunning) return;
    updateConfig(partial);
  };

  if (layout === 'inline') {
    return <InlineLayout config={config} update={update} isRunning={isRunning} />;
  }

  return <ModalLayout config={config} update={update} />;
}

// ============================================================================
// Modal layout (grid-based, previously BalancingModal body)
// ============================================================================

function ModalLayout({
  config,
  update,
}: {
  config: BalancingConfig;
  update: (p: Partial<BalancingConfig>) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Row 1: Plan + Reflect */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
          <SectionHeader icon={Brain} label="Plan Phase" colorClass="text-cyan-400" />
          <div className="text-caption text-gray-500 mb-2">
            Single LLM call analyzes goal + context &rarr; generates task list with dependencies.
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-gray-400">Provider / Model</span>
            <ProviderModelSelect
              provider={config.plannerProvider || 'claude'}
              model={config.plannerModel}
              onProviderChange={(p) => update({ plannerProvider: p })}
              onModelChange={(m) => update({ plannerModel: m })}
            />
          </div>
        </div>

        <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
          <SectionHeader icon={Sparkles} label="Reflect Phase" colorClass="text-pink-400" />
          <div className="text-caption text-gray-500 mb-2">
            Single LLM call reviews results &rarr; decides done, continue (adaptive), or needs input.
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-gray-400">Provider / Model</span>
            <ProviderModelSelect
              provider={config.reflectProvider || 'claude'}
              model={config.reflectModel || null}
              onProviderChange={(p) => update({ reflectProvider: p })}
              onModelChange={(m) => update({ reflectModel: m })}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Brain + Dispatch + Budget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
          <SectionHeader icon={Brain} label="Brain" colorClass="text-indigo-400" />
          <Toggle
            label="Brain Questions (pre-cycle)"
            checked={!!config.brainQuestionsEnabled}
            onChange={(v) => update({ brainQuestionsEnabled: v })}
          />
        </div>

        <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
          <SectionHeader icon={Zap} label="Dispatch" colorClass="text-purple-400" />
          <SliderControl
            label="Max Concurrent Tasks"
            value={config.maxConcurrentTasks}
            min={1}
            max={config.useWorktrees ? 8 : 4}
            onChange={(v) => update({ maxConcurrentTasks: v })}
          />
          <SliderControl
            label="Task Timeout"
            value={Math.round((config.executionTimeoutMs || 6000000) / 60000)}
            min={5}
            max={120}
            step={5}
            suffix=" min"
            onChange={(v) => update({ executionTimeoutMs: v * 60000 })}
            valueColor="text-purple-400"
          />
          <Toggle
            label="Worktree Isolation"
            checked={!!config.useWorktrees}
            onChange={(v) => {
              const updates: Partial<BalancingConfig> = { useWorktrees: v };
              if (v && config.maxConcurrentTasks < 4) {
                updates.maxConcurrentTasks = 4;
              }
              update(updates);
            }}
          />
          {config.useWorktrees && (
            <div className="flex items-center gap-1.5 mt-1">
              <GitBranch className="w-3 h-3 text-purple-500" />
              <span className="text-2xs text-gray-500">
                Each task gets an isolated git worktree. Branches merged after completion.
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
          <SectionHeader icon={DollarSign} label="Budget" colorClass="text-emerald-400" />
          <SliderControl
            label="Max Cycles per Run"
            value={config.maxCyclesPerRun}
            min={1}
            max={10}
            onChange={(v) => update({ maxCyclesPerRun: v })}
          />
          <Toggle
            label="Self-Healing"
            checked={config.healingEnabled}
            onChange={(v) => update({ healingEnabled: v })}
          />
        </div>
      </div>

      {/* Row 3: Execution Routing */}
      <div className="p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
        <SectionHeader icon={Zap} label="Execution Routing" colorClass="text-orange-400" />
        <ComplexityRoutingTable
          routing={config.modelRouting}
          onChange={(routing) => update({ modelRouting: routing })}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Inline layout (collapsible sections, previously BalancingPanel)
// ============================================================================

function InlineLayout({
  config,
  update,
  isRunning,
}: {
  config: BalancingConfig;
  update: (p: Partial<BalancingConfig>) => void;
  isRunning: boolean;
}) {
  return (
    <div className="max-h-[400px] overflow-y-auto" data-testid="balancing-panel">
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

      {/* Execution / Model Routing */}
      <CollapsibleSection title="Execution" icon={Zap}>
        <div className="space-y-3">
          <ComplexityRoutingTable
            routing={config.modelRouting}
            onChange={(routing) => update({ modelRouting: routing })}
            disabled={isRunning}
          />
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
        <Toggle
          label="Quota Limits"
          checked={config.quotaLimits.enabled}
          onChange={(v) => update({
            quotaLimits: { ...config.quotaLimits, enabled: v },
          })}
        />
        {config.quotaLimits.enabled && (
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
        )}
      </CollapsibleSection>

      {/* Disabled overlay when running */}
      {isRunning && (
        <div className="absolute inset-0 bg-gray-900/40 rounded-xl flex items-center justify-center pointer-events-none">
          <span className="text-xs text-gray-500">Locked while running</span>
        </div>
      )}
    </div>
  );
}
