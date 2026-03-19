/**
 * BalancingModal — Pipeline configuration modal (v3)
 *
 * Layout:
 * - Row 1 (2 columns): Plan Phase | Reflect Phase
 * - Row 2 (3 columns): Brain | Dispatch | Budget
 * - Row 3 (full width): Execution Routing
 */

'use client';

import type { ComponentType } from 'react';
import {
  Settings2, RotateCcw,
  Zap, Brain, Sparkles,
  DollarSign, GitBranch,
} from 'lucide-react';
import { UniversalModal } from '@/components/UniversalModal';
import { useConductorStore } from '../lib/conductorStore';
import type { BalancingConfig, ModelRoutingRule } from '../lib/types';
import type { CLIProvider } from '@/lib/claude-terminal/types';
import { PROVIDER_MODELS } from '@/lib/claude-terminal/types';

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

// ============================================================================
// Model Routing Table
// ============================================================================

const PROVIDERS: CLIProvider[] = ['claude', 'gemini', 'copilot', 'ollama'];

const TIER_META: { condition: ModelRoutingRule['condition']; label: string; effort: string; color: string }[] = [
  { condition: 'complexity_1', label: 'Effort 1-3', effort: 'Low', color: 'text-emerald-400' },
  { condition: 'complexity_2', label: 'Effort 4-6', effort: 'Med', color: 'text-amber-400' },
  { condition: 'complexity_3', label: 'Effort 7+', effort: 'High', color: 'text-red-400' },
];

const selectClass = "bg-gray-800 text-gray-200 text-caption rounded-md px-1.5 py-1 border border-gray-700 outline-none focus:border-cyan-600 transition-colors cursor-pointer w-full";

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
// Main Modal
// ============================================================================

export default function BalancingModal({ isOpen, onClose }: BalancingModalProps) {
  const { config, updateConfig, resetConfig } = useConductorStore();

  const update = (partial: Partial<BalancingConfig>) => {
    updateConfig(partial);
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pipeline Settings"
      subtitle="Configure pipeline settings"
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
            V3 Pipeline Settings
            ================================================================ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* PLAN Phase Settings */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
                <SectionHeader icon={Brain} label="Plan Phase" colorClass="text-cyan-400" />
                <div className="text-caption text-gray-500 mb-2">
                  Single LLM call analyzes goal + context → generates task list with dependencies.
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

              {/* REFLECT Phase Settings */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
                <SectionHeader icon={Sparkles} label="Reflect Phase" colorClass="text-pink-400" />
                <div className="text-caption text-gray-500 mb-2">
                  Single LLM call reviews results → decides done, continue (adaptive), or needs input.
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

            {/* Brain + Dispatch + Budget row for v3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Brain Questions */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
                <SectionHeader icon={Brain} label="Brain" colorClass="text-indigo-400" />
                <Toggle
                  label="Brain Questions (pre-cycle)"
                  checked={!!config.brainQuestionsEnabled}
                  onChange={(v) => update({ brainQuestionsEnabled: v })}
                />
              </div>

              {/* Dispatch */}
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

              {/* Budget */}
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

            {/* Model Routing for v3 */}
            <div className="p-4 rounded-xl bg-gray-800/20 border border-gray-800/50">
              <SectionHeader icon={Zap} label="Execution Routing" colorClass="text-orange-400" />
              <ComplexityRoutingTable
                routing={config.modelRouting}
                onChange={(routing) => update({ modelRouting: routing })}
              />
            </div>
      </div>
    </UniversalModal>
  );
}
