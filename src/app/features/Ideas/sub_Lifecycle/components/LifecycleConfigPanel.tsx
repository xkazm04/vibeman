'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Rocket,
  Clock,
  Bell,
} from 'lucide-react';
import {
  LifecycleConfig,
  LifecycleTrigger,
  QualityGateType,
  DeploymentTarget,
  DEFAULT_LIFECYCLE_CONFIG,
} from '../lib/lifecycleTypes';
import { ScanType, SCAN_TYPE_CONFIGS } from '../../lib/scanTypes';

interface LifecycleConfigPanelProps {
  config: Partial<LifecycleConfig>;
  onConfigChange: (updates: Partial<LifecycleConfig>) => void;
  disabled?: boolean;
}

const TRIGGER_OPTIONS: { value: LifecycleTrigger; label: string }[] = [
  { value: 'code_change', label: 'File Changes' },
  { value: 'git_push', label: 'Git Push' },
  { value: 'git_commit', label: 'Git Commit' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'manual', label: 'Manual' },
  { value: 'scan_complete', label: 'Scan Complete' },
  { value: 'idea_implemented', label: 'Idea Implemented' },
];

const GATE_OPTIONS: { value: QualityGateType; label: string }[] = [
  { value: 'type_check', label: 'Type Check' },
  { value: 'lint', label: 'Lint' },
  { value: 'build', label: 'Build' },
  { value: 'unit_test', label: 'Unit Tests' },
  { value: 'integration_test', label: 'Integration Tests' },
  { value: 'security_scan', label: 'Security Scan' },
  { value: 'coverage', label: 'Coverage' },
];

const DEPLOY_OPTIONS: { value: DeploymentTarget; label: string }[] = [
  { value: 'local', label: 'Local Only' },
  { value: 'git_branch', label: 'Git Branch' },
  { value: 'pull_request', label: 'Pull Request' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
];

export default function LifecycleConfigPanel({
  config,
  onConfigChange,
  disabled = false,
}: LifecycleConfigPanelProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['triggers']);

  const currentConfig = { ...DEFAULT_LIFECYCLE_CONFIG, ...config };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] => {
    return arr.includes(item)
      ? arr.filter(i => i !== item)
      : [...arr, item];
  };

  const SectionHeader = ({
    title,
    icon: Icon,
    section,
  }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    section: string;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="flex items-center justify-between w-full px-3 py-2 text-left text-sm font-medium text-gray-300 hover:bg-gray-700/30 rounded-lg transition-colors"
      data-testid={`lifecycle-config-section-${section}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span>{title}</span>
      </div>
      {expandedSections.includes(section) ? (
        <ChevronUp className="w-4 h-4 text-gray-500" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-500" />
      )}
    </button>
  );

  const Checkbox = ({
    checked,
    onChange,
    label,
    disabled: isDisabled,
    testId,
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
    disabled?: boolean;
    testId: string;
  }) => (
    <label
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700/20'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={isDisabled || disabled}
        className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/50"
        data-testid={testId}
      />
      <span className="text-xs text-gray-400">{label}</span>
    </label>
  );

  return (
    <div
      className="bg-gray-800/40 border border-gray-700/40 rounded-lg overflow-hidden"
      data-testid="lifecycle-config-panel"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/40">
        <Settings className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">Lifecycle Configuration</span>
      </div>

      {/* Enabled Toggle */}
      <div className="px-4 py-3 border-b border-gray-700/40">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-300">Enable Lifecycle Automation</span>
          <button
            onClick={() => onConfigChange({ enabled: !currentConfig.enabled })}
            disabled={disabled}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              currentConfig.enabled ? 'bg-green-500' : 'bg-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            data-testid="lifecycle-config-enabled-toggle"
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                currentConfig.enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Sections */}
      <div className="divide-y divide-gray-700/40">
        {/* Triggers Section */}
        <div>
          <SectionHeader title="Triggers" icon={Zap} section="triggers" />
          <AnimatePresence>
            {expandedSections.includes('triggers') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-1">
                  {TRIGGER_OPTIONS.map(option => (
                    <Checkbox
                      key={option.value}
                      checked={currentConfig.triggers.includes(option.value)}
                      onChange={() =>
                        onConfigChange({
                          triggers: toggleArrayItem(currentConfig.triggers, option.value),
                        })
                      }
                      label={option.label}
                      testId={`lifecycle-trigger-${option.value}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scan Types Section */}
        <div>
          <SectionHeader title="Scan Types" icon={Zap} section="scans" />
          <AnimatePresence>
            {expandedSections.includes('scans') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                  {SCAN_TYPE_CONFIGS.map(scanConfig => (
                    <Checkbox
                      key={scanConfig.value}
                      checked={currentConfig.scan_types.includes(scanConfig.value)}
                      onChange={() =>
                        onConfigChange({
                          scan_types: toggleArrayItem(currentConfig.scan_types, scanConfig.value),
                        })
                      }
                      label={`${scanConfig.emoji} ${scanConfig.label}`}
                      testId={`lifecycle-scan-${scanConfig.value}`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quality Gates Section */}
        <div>
          <SectionHeader title="Quality Gates" icon={Shield} section="gates" />
          <AnimatePresence>
            {expandedSections.includes('gates') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-1">
                  {GATE_OPTIONS.map(option => (
                    <Checkbox
                      key={option.value}
                      checked={currentConfig.quality_gates.includes(option.value)}
                      onChange={() =>
                        onConfigChange({
                          quality_gates: toggleArrayItem(currentConfig.quality_gates, option.value),
                        })
                      }
                      label={option.label}
                      testId={`lifecycle-gate-${option.value}`}
                    />
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700/40">
                  <Checkbox
                    checked={currentConfig.fail_fast}
                    onChange={() => onConfigChange({ fail_fast: !currentConfig.fail_fast })}
                    label="Fail fast (stop on first gate failure)"
                    testId="lifecycle-fail-fast"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Deployment Section */}
        <div>
          <SectionHeader title="Deployment" icon={Rocket} section="deploy" />
          <AnimatePresence>
            {expandedSections.includes('deploy') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 overflow-hidden"
              >
                <Checkbox
                  checked={currentConfig.auto_deploy}
                  onChange={() => onConfigChange({ auto_deploy: !currentConfig.auto_deploy })}
                  label="Enable auto-deploy"
                  testId="lifecycle-auto-deploy"
                />

                {currentConfig.auto_deploy && (
                  <div className="mt-2 pl-5 space-y-1">
                    {DEPLOY_OPTIONS.map(option => (
                      <Checkbox
                        key={option.value}
                        checked={currentConfig.deployment_targets.includes(option.value)}
                        onChange={() =>
                          onConfigChange({
                            deployment_targets: toggleArrayItem(
                              currentConfig.deployment_targets,
                              option.value
                            ),
                          })
                        }
                        label={option.label}
                        testId={`lifecycle-deploy-${option.value}`}
                      />
                    ))}

                    <div className="mt-2 pt-2 border-t border-gray-700/40">
                      <Checkbox
                        checked={currentConfig.deploy_on_weekend}
                        onChange={() =>
                          onConfigChange({ deploy_on_weekend: !currentConfig.deploy_on_weekend })
                        }
                        label="Allow weekend deployments"
                        testId="lifecycle-deploy-weekend"
                      />
                      <Checkbox
                        checked={currentConfig.deploy_during_business_hours}
                        onChange={() =>
                          onConfigChange({
                            deploy_during_business_hours: !currentConfig.deploy_during_business_hours,
                          })
                        }
                        label="Business hours only"
                        testId="lifecycle-deploy-business-hours"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Auto-resolve Section */}
        <div>
          <SectionHeader title="Auto-Resolution" icon={Zap} section="resolve" />
          <AnimatePresence>
            {expandedSections.includes('resolve') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 overflow-hidden"
              >
                <Checkbox
                  checked={currentConfig.auto_resolve}
                  onChange={() => onConfigChange({ auto_resolve: !currentConfig.auto_resolve })}
                  label="Enable auto-resolution"
                  testId="lifecycle-auto-resolve"
                />

                {currentConfig.auto_resolve && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Max implementations per cycle
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={currentConfig.max_auto_implementations}
                        onChange={e =>
                          onConfigChange({
                            max_auto_implementations: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        disabled={disabled}
                        className="w-full px-2 py-1 text-sm bg-gray-700/50 border border-gray-600/40 rounded text-gray-300"
                        data-testid="lifecycle-max-implementations"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Priority threshold (0-100)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={currentConfig.priority_threshold}
                        onChange={e =>
                          onConfigChange({
                            priority_threshold: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        disabled={disabled}
                        className="w-full px-2 py-1 text-sm bg-gray-700/50 border border-gray-600/40 rounded text-gray-300"
                        data-testid="lifecycle-priority-threshold"
                      />
                    </div>

                    <Checkbox
                      checked={currentConfig.require_approval}
                      onChange={() =>
                        onConfigChange({ require_approval: !currentConfig.require_approval })
                      }
                      label="Require human approval"
                      testId="lifecycle-require-approval"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rate Limiting Section */}
        <div>
          <SectionHeader title="Rate Limiting" icon={Clock} section="rate" />
          <AnimatePresence>
            {expandedSections.includes('rate') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 overflow-hidden space-y-3"
              >
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Minimum interval between cycles (seconds)
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={Math.floor(currentConfig.min_cycle_interval_ms / 1000)}
                    onChange={e =>
                      onConfigChange({
                        min_cycle_interval_ms: (parseInt(e.target.value, 10) || 60) * 1000,
                      })
                    }
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm bg-gray-700/50 border border-gray-600/40 rounded text-gray-300"
                    data-testid="lifecycle-min-interval"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Cooldown on failure (seconds)
                  </label>
                  <input
                    type="number"
                    min={60}
                    value={Math.floor(currentConfig.cooldown_on_failure_ms / 1000)}
                    onChange={e =>
                      onConfigChange({
                        cooldown_on_failure_ms: (parseInt(e.target.value, 10) || 300) * 1000,
                      })
                    }
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm bg-gray-700/50 border border-gray-600/40 rounded text-gray-300"
                    data-testid="lifecycle-cooldown"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
