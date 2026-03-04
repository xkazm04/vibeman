/**
 * BalancingModal — Full-screen pipeline configuration modal
 *
 * Redesigned layout based on content richness:
 * - Row 1 (full width): Scout — 3 internal columns for strategy, scan types by category, contexts by group
 * - Row 2 (2 columns): Triage | Batch
 * - Row 3 (2 columns): Model Routing | Budget + Healing + Usage
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings2, RotateCcw,
  Search, Filter, Layers, Zap, Brain, Activity,
  Shield, DollarSign, CheckSquare, Square,
} from 'lucide-react';
import StyledCheckbox from '@/components/ui/StyledCheckbox';
import { UniversalModal } from '@/components/UniversalModal';
import { useConductorStore } from '../../lib/conductor/conductorStore';
import type { BalancingConfig, ScanStrategy, ContextStrategy, BatchStrategy, ModelRoutingRule } from '../../lib/conductor/types';
import type { CLIProvider } from '@/lib/claude-terminal/types';
import { PROVIDER_MODELS } from '@/lib/claude-terminal/types';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { AGENT_REGISTRY, getAgentsByCategory } from '@/app/features/Ideas/lib/scanTypes';
import type { ScanType, AgentCategory } from '@/app/features/Ideas/lib/scanTypes';

interface BalancingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Shared Controls
// ============================================================================

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
    <div className="space-y-1.5">
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
        className="w-full h-1.5 rounded-full appearance-none bg-gray-700 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
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
  accentColor = 'cyan',
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accentColor?: string;
}) {
  const activeClass = accentColor === 'cyan'
    ? 'bg-cyan-600/30 text-cyan-300'
    : accentColor === 'amber'
    ? 'bg-amber-600/30 text-amber-300'
    : 'bg-purple-600/30 text-purple-300';

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-2.5 py-2 text-[11px] font-medium transition-all
              ${value === opt.value
                ? activeClass
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative ${
          checked ? 'bg-cyan-600' : 'bg-gray-700'
        }`}
      >
        <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`} />
      </button>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  colorClass,
}: {
  icon: typeof Search;
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

// ============================================================================
// Model Routing Table
// ============================================================================

const PROVIDERS: CLIProvider[] = ['claude', 'gemini', 'copilot', 'ollama'];

const TIER_META: { condition: ModelRoutingRule['condition']; label: string; effort: string; color: string }[] = [
  { condition: 'complexity_1', label: 'Effort 1-3', effort: 'Low', color: 'text-emerald-400' },
  { condition: 'complexity_2', label: 'Effort 4-6', effort: 'Med', color: 'text-amber-400' },
  { condition: 'complexity_3', label: 'Effort 7+', effort: 'High', color: 'text-red-400' },
];

const selectClass = "bg-gray-800 text-gray-200 text-[11px] rounded-md px-1.5 py-1 border border-gray-700 outline-none focus:border-cyan-600 transition-colors cursor-pointer w-full";

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

function ComplexityRoutingTable({
  routing,
  onChange,
}: {
  routing: ModelRoutingRule[];
  onChange: (routing: ModelRoutingRule[]) => void;
}) {
  const handleRuleChange = (condition: ModelRoutingRule['condition'], provider: CLIProvider, model: string) => {
    const newRouting = routing.map((r) =>
      r.condition === condition ? { ...r, provider, model } : r
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
            className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-gray-800/30 transition-colors"
            data-testid={`routing-row-${tier.condition}`}
          >
            <span className={`text-[11px] font-mono font-bold w-[52px] flex-shrink-0 ${tier.color}`}>
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
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={rule.model}
              onChange={(e) => handleRuleChange(tier.condition, rule.provider, e.target.value)}
              className={selectClass}
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

// ============================================================================
// Subscription Usage
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
    try {
      const res = await fetch('/api/conductor/usage');
      if (res.ok) {
        const d = await res.json();
        const data: UsageData[] = [];
        if (d.claude) data.push({ provider: 'claude', label: 'Claude', used: d.claude.used, limit: d.claude.limit, unit: d.claude.unit || 'req/min', color: 'text-orange-400' });
        if (d.copilot) data.push({ provider: 'copilot', label: 'Copilot', used: d.copilot.used, limit: d.copilot.limit, unit: d.copilot.unit || 'req/mo', color: 'text-blue-400' });
        if (d.gemini) data.push({ provider: 'gemini', label: 'Gemini', used: d.gemini.used, limit: d.gemini.limit, unit: d.gemini.unit || 'req/day', color: 'text-emerald-400' });
        setUsage(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60_000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  if (usage.length === 0 && !loading) {
    return (
      <p className="text-[10px] text-gray-600 italic">
        No usage data — configure API keys
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {usage.map((u) => (
        <div key={u.provider} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${u.color}`}>{u.label}</span>
            <span className="text-[10px] text-gray-500 font-mono">
              {u.used ?? '?'}/{u.limit ?? '?'} {u.unit}
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
        </div>
      ))}
      {loading && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
    </div>
  );
}

// ============================================================================
// Scan Type Selector — Grouped by Category
// ============================================================================

const CATEGORY_META: Record<AgentCategory, { label: string; color: string }> = {
  technical: { label: 'Technical', color: 'text-cyan-400' },
  user: { label: 'User', color: 'text-pink-400' },
  business: { label: 'Business', color: 'text-orange-400' },
  mastermind: { label: 'Mastermind', color: 'text-amber-400' },
};

const CATEGORIES: AgentCategory[] = ['technical', 'user', 'business', 'mastermind'];

function ScanTypeSelector({
  selectedTypes,
  onChange,
}: {
  selectedTypes: ScanType[];
  onChange: (types: ScanType[]) => void;
}) {
  const safe = Array.isArray(selectedTypes) ? selectedTypes : [];

  const toggle = (type: ScanType) => {
    onChange(
      safe.includes(type)
        ? safe.filter((t) => t !== type)
        : [...safe, type]
    );
  };

  const toggleCategory = (category: AgentCategory) => {
    const agents = getAgentsByCategory(category);
    const categoryTypes = agents.map(a => a.id);
    const allSelected = categoryTypes.every(t => safe.includes(t));
    if (allSelected) {
      onChange(safe.filter(t => !categoryTypes.includes(t)));
    } else {
      const merged = new Set([...safe, ...categoryTypes]);
      onChange(Array.from(merged));
    }
  };

  return (
    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-700">
      {CATEGORIES.map((cat) => {
        const agents = getAgentsByCategory(cat);
        const meta = CATEGORY_META[cat];
        const allSelected = agents.every(a => safe.includes(a.id));
        const someSelected = agents.some(a => safe.includes(a.id));

        return (
          <div key={cat}>
            <button
              onClick={() => toggleCategory(cat)}
              className="flex items-center gap-1.5 mb-1 group cursor-pointer"
            >
              {allSelected ? (
                <CheckSquare className={`w-3 h-3 ${meta.color}`} />
              ) : (
                <Square className={`w-3 h-3 ${someSelected ? meta.color : 'text-gray-600'}`} />
              )}
              <span className={`text-[10px] uppercase font-bold tracking-wide ${meta.color}`}>
                {meta.label}
              </span>
              <span className="text-[10px] text-gray-600">
                ({agents.filter(a => safe.includes(a.id)).length}/{agents.length})
              </span>
            </button>
            <div className="grid grid-cols-2 gap-x-1">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-gray-800/40 cursor-pointer transition-colors"
                >
                  <StyledCheckbox
                    checked={safe.includes(agent.id)}
                    onChange={() => toggle(agent.id)}
                    size="sm"
                    colorScheme="cyan"
                  />
                  <span className="text-[11px]">{agent.emoji}</span>
                  <span className="text-[11px] text-gray-300 truncate">{agent.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Context Selector — Grouped by Context Group
// ============================================================================

interface ContextOption {
  id: string;
  name: string;
  category?: string;
  group_id?: string;
}

interface ContextGroup {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

function ContextSelector({
  projectId,
  selectedIds,
  onChange,
}: {
  projectId: string | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [contexts, setContexts] = useState<ContextOption[]>([]);
  const [groups, setGroups] = useState<ContextGroup[]>([]);
  const safe = Array.isArray(selectedIds) ? selectedIds : [];

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/contexts?projectId=${projectId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.success && d.data) {
          // API returns { contexts: [...], groups: [...] }
          const ctxArr = Array.isArray(d.data.contexts) ? d.data.contexts : [];
          const grpArr = Array.isArray(d.data.groups) ? d.data.groups : [];
          setContexts(ctxArr);
          setGroups(grpArr);
        }
      })
      .catch(() => {});
  }, [projectId]);

  // Group contexts by their group_id
  const grouped = useMemo(() => {
    const map = new Map<string | null, ContextOption[]>();
    for (const ctx of contexts) {
      const gid = ctx.group_id || null;
      if (!map.has(gid)) map.set(gid, []);
      map.get(gid)!.push(ctx);
    }
    // Sort: grouped first (in group order), ungrouped last
    const ordered: { group: ContextGroup | null; contexts: ContextOption[] }[] = [];
    for (const grp of groups) {
      const ctxs = map.get(grp.id);
      if (ctxs && ctxs.length > 0) {
        ordered.push({ group: grp, contexts: ctxs });
      }
    }
    const ungrouped = map.get(null);
    if (ungrouped && ungrouped.length > 0) {
      ordered.push({ group: null, contexts: ungrouped });
    }
    return ordered;
  }, [contexts, groups]);

  if (contexts.length === 0) {
    return (
      <p className="text-[10px] text-gray-600 italic">
        No contexts found for this project
      </p>
    );
  }

  const toggle = (id: string) => {
    onChange(
      safe.includes(id)
        ? safe.filter((x) => x !== id)
        : [...safe, id]
    );
  };

  const toggleGroup = (groupCtxs: ContextOption[]) => {
    const ids = groupCtxs.map(c => c.id);
    const allSelected = ids.every(id => safe.includes(id));
    if (allSelected) {
      onChange(safe.filter(id => !ids.includes(id)));
    } else {
      const merged = new Set([...safe, ...ids]);
      onChange(Array.from(merged));
    }
  };

  return (
    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-700">
      {grouped.map(({ group, contexts: ctxs }) => {
        const allSelected = ctxs.every(c => safe.includes(c.id));
        const someSelected = ctxs.some(c => safe.includes(c.id));

        return (
          <div key={group?.id || 'ungrouped'}>
            <button
              onClick={() => toggleGroup(ctxs)}
              className="flex items-center gap-1.5 mb-1 group cursor-pointer"
            >
              {allSelected ? (
                <CheckSquare className="w-3 h-3 text-cyan-400" />
              ) : (
                <Square className={`w-3 h-3 ${someSelected ? 'text-cyan-400' : 'text-gray-600'}`} />
              )}
              {group?.icon && <span className="text-[11px]">{group.icon}</span>}
              <span
                className="text-[10px] uppercase font-bold tracking-wide"
                style={{ color: group?.color || undefined }}
              >
                {group?.name || 'Ungrouped'}
              </span>
              <span className="text-[10px] text-gray-600">
                ({ctxs.filter(c => safe.includes(c.id)).length}/{ctxs.length})
              </span>
            </button>
            <div className="grid grid-cols-2 gap-x-1">
              {ctxs.map((ctx) => (
                <div
                  key={ctx.id}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-gray-800/40 cursor-pointer transition-colors"
                >
                  <StyledCheckbox
                    checked={safe.includes(ctx.id)}
                    onChange={() => toggle(ctx.id)}
                    size="sm"
                    colorScheme="cyan"
                  />
                  <span className="text-[11px] text-gray-300 truncate">{ctx.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Modal
// ============================================================================

export default function BalancingModal({ isOpen, onClose }: BalancingModalProps) {
  const { config, updateConfig, resetConfig } = useConductorStore();
  const activeProject = useActiveProjectStore((s) => s.activeProject);

  const update = (partial: Partial<BalancingConfig>) => {
    updateConfig(partial);
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pipeline Settings"
      subtitle="Configure balancing, routing, and budget controls"
      icon={Settings2}
      iconBgColor="from-cyan-900/60 to-purple-900/60"
      iconColor="text-cyan-400"
      maxWidth="max-w-5xl"
      footerActions={[
        {
          icon: RotateCcw,
          label: 'Reset Defaults',
          onClick: resetConfig,
          variant: 'secondary',
          testId: 'reset-defaults-btn',
        },
      ]}
    >
      <div className="space-y-5">
        {/* ================================================================
            Row 1: Scout — Full Width with 3 Internal Columns
            ================================================================ */}
        <div className="p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
          <SectionHeader icon={Search} label="Scout" colorClass="text-cyan-400" />
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_1fr] gap-5">
            {/* Column 1: Strategy + Sliders */}
            <div className="space-y-3">
              <ToggleGroup<ScanStrategy>
                label="Scan Strategy"
                options={[
                  { value: 'rotate', label: 'Rotate' },
                  { value: 'weighted', label: 'Weighted' },
                  { value: 'brain-driven', label: 'Brain' },
                ]}
                value={config.scanStrategy || 'brain-driven'}
                onChange={(v) => update({ scanStrategy: v })}
                accentColor="cyan"
              />
              <ToggleGroup<ContextStrategy>
                label="Context Strategy"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'brain-driven', label: 'Brain' },
                  { value: 'selected', label: 'Custom' },
                ]}
                value={config.contextStrategy || 'all'}
                onChange={(v) => update({ contextStrategy: v })}
                accentColor="cyan"
              />
              <SliderControl
                label="Max Ideas / Cycle"
                value={config.maxIdeasPerCycle}
                min={1}
                max={30}
                onChange={(v) => update({ maxIdeasPerCycle: v })}
              />
              <div className="space-y-1.5">
                <span className="text-xs text-gray-400">Provider / Model</span>
                <ProviderModelSelect
                  provider={config.scanProvider}
                  model={config.scanModel}
                  onProviderChange={(p) => update({ scanProvider: p })}
                  onModelChange={(m) => update({ scanModel: m })}
                />
              </div>
            </div>

            {/* Column 2: Scan Types by Category */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2 tracking-wide">
                Scan Types
              </div>
              <ScanTypeSelector
                selectedTypes={config.scanTypes as ScanType[]}
                onChange={(types) => update({ scanTypes: types })}
              />
            </div>

            {/* Column 3: Contexts */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2 tracking-wide">
                {config.contextStrategy === 'selected' ? 'Selected Contexts' : 'Contexts (auto)'}
              </div>
              {config.contextStrategy === 'selected' ? (
                <ContextSelector
                  projectId={activeProject?.id || null}
                  selectedIds={config.contextIds || []}
                  onChange={(ids) => update({ contextIds: ids })}
                />
              ) : (
                <div className="text-[11px] text-gray-500 p-3 rounded-lg bg-gray-800/30 border border-gray-800/40">
                  {config.contextStrategy === 'all'
                    ? 'All project contexts will be included in each scan cycle.'
                    : 'Brain will select optimal contexts based on behavioral signals and recent activity.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================
            Row 2: Triage | Batch
            ================================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Triage */}
          <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
            <SectionHeader icon={Filter} label="Triage" colorClass="text-amber-400" />
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
            <div className="space-y-1.5">
              <span className="text-xs text-gray-400">Provider / Model</span>
              <ProviderModelSelect
                provider={config.triageProvider}
                model={config.triageModel}
                onProviderChange={(p) => update({ triageProvider: p })}
                onModelChange={(m) => update({ triageModel: m })}
              />
            </div>
          </div>

          {/* Batch */}
          <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
            <SectionHeader icon={Layers} label="Batch" colorClass="text-purple-400" />
            <ToggleGroup<BatchStrategy>
              label="Batch Strategy"
              options={[
                { value: 'sequential', label: 'Sequential' },
                { value: 'parallel', label: 'Parallel' },
                { value: 'dag', label: 'DAG' },
              ]}
              value={config.batchStrategy}
              onChange={(v) => update({ batchStrategy: v })}
              accentColor="purple"
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
          </div>
        </div>

        {/* ================================================================
            Row 3: Model Routing | Budget + Healing + Usage
            ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Execution Routing */}
          <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
            <SectionHeader icon={Zap} label="Execution Routing" colorClass="text-orange-400" />
            <SliderControl
              label="Task Timeout"
              value={Math.round((config.executionTimeoutMs || 6000000) / 60000)}
              min={5}
              max={120}
              step={5}
              suffix=" min"
              onChange={(v) => update({ executionTimeoutMs: v * 60000 })}
              valueColor="text-orange-400"
            />
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide">By Effort Score</span>
            </div>
            <ComplexityRoutingTable
              routing={config.modelRouting}
              onChange={(routing) => update({ modelRouting: routing })}
            />
          </div>

          {/* Budget + Healing + Usage */}
          <div className="space-y-4 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
            {/* Budget */}
            <div className="space-y-3">
              <SectionHeader icon={DollarSign} label="Budget" colorClass="text-emerald-400" />
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
            </div>

            <div className="border-t border-gray-800/50" />

            {/* Healing */}
            <div className="space-y-3">
              <SectionHeader icon={Shield} label="Self-Healing" colorClass="text-pink-400" />
              <Toggle
                label="Enable Healing"
                checked={config.healingEnabled}
                onChange={(v) => update({ healingEnabled: v })}
              />
              {config.healingEnabled && (
                <SliderControl
                  label="Error Threshold (trigger at)"
                  value={config.healingThreshold}
                  min={1}
                  max={10}
                  onChange={(v) => update({ healingThreshold: v })}
                  valueColor="text-pink-400"
                />
              )}
            </div>

            <div className="border-t border-gray-800/50" />

            {/* Usage */}
            <div className="space-y-3">
              <SectionHeader icon={Activity} label="Subscription Usage" colorClass="text-blue-400" />
              <SubscriptionUsage />
            </div>
          </div>
        </div>
      </div>
    </UniversalModal>
  );
}
