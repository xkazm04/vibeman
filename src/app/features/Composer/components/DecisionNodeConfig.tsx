/**
 * Decision Node Configuration
 * Allows users to configure decision points in the blueprint pipeline
 * where human review/approval is required before proceeding
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, Eye, EyeOff, Zap
} from 'lucide-react';
import { DecisionNodeConfig as DecisionNodeConfigType } from '../types';

interface DecisionNodeConfigProps {
  config: DecisionNodeConfigType;
  onChange: (config: DecisionNodeConfigType) => void;
  onRemove?: () => void;
  position?: 'after-analyzer' | 'after-processor' | 'before-executor';
}

const POSITIONS = [
  { value: 'after-analyzer', label: 'After Analyzer', description: 'Review issues before processing' },
  { value: 'after-processor', label: 'After Processor', description: 'Review filtered/grouped issues' },
  { value: 'before-executor', label: 'Before Executor', description: 'Final review before execution' },
] as const;

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'medium', label: 'Medium', color: '#8b5cf6' },
  { value: 'low', label: 'Low', color: '#10b981' },
] as const;

export default function DecisionNodeConfig({
  config,
  onChange,
  onRemove,
  position,
}: DecisionNodeConfigProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleToggleEnabled = () => {
    onChange({ ...config, enabled: !config.enabled });
  };

  const handleToggleAutoApprove = () => {
    onChange({ ...config, autoApprove: !config.autoApprove });
  };

  const handlePositionChange = (newPosition: DecisionNodeConfigType['position']) => {
    onChange({ ...config, position: newPosition });
  };

  const handleSeverityChange = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    onChange({
      ...config,
      approvalThreshold: {
        ...config.approvalThreshold,
        severity,
      },
    });
  };

  const handleMaxIssuesChange = (maxIssues: number | undefined) => {
    onChange({
      ...config,
      approvalThreshold: {
        ...config.approvalThreshold,
        severity: config.approvalThreshold?.severity || 'high',
        maxIssues,
      },
    });
  };

  return (
    <motion.div
      layout
      className={`relative border rounded-xl transition-all ${
        config.enabled
          ? 'bg-pink-500/5 border-pink-500/30'
          : 'bg-gray-900/50 border-gray-800/50'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleEnabled();
          }}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            config.enabled ? 'bg-pink-500' : 'bg-gray-700'
          }`}
        >
          <motion.div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
            animate={{ left: config.enabled ? 'calc(100% - 18px)' : '2px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>

        {/* Icon & Label */}
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            config.enabled ? 'bg-pink-500/20' : 'bg-gray-800'
          }`}>
            <HelpCircle className={`w-4 h-4 ${
              config.enabled ? 'text-pink-400' : 'text-gray-500'
            }`} />
          </div>
          <div>
            <div className={`text-xs font-medium ${
              config.enabled ? 'text-pink-300' : 'text-gray-400'
            }`}>
              Decision Gate
            </div>
            <div className="text-[10px] text-gray-600">
              {POSITIONS.find(p => p.value === config.position)?.label || 'Not set'}
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {config.autoApprove && config.enabled && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/20 text-emerald-400 rounded">
              Auto
            </span>
          )}
          {config.approvalThreshold && config.enabled && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-pink-500/20 text-pink-400 rounded">
              Threshold
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && config.enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-4 border-t border-gray-800/50 pt-3">
              {/* Position Selection */}
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Gate Position
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => handlePositionChange(pos.value)}
                      className={`p-2 rounded-lg text-center transition-all ${
                        config.position === pos.value
                          ? 'bg-pink-500/20 border border-pink-500/30'
                          : 'bg-gray-800/50 border border-transparent hover:border-gray-700'
                      }`}
                    >
                      <div className={`text-[10px] font-medium ${
                        config.position === pos.value ? 'text-pink-300' : 'text-gray-400'
                      }`}>
                        {pos.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Approve Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-400">Auto-Approve</div>
                  <div className="text-[10px] text-gray-600">
                    Automatically approve if within threshold
                  </div>
                </div>
                <button
                  onClick={handleToggleAutoApprove}
                  className={`p-2 rounded-lg transition-colors ${
                    config.autoApprove
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {config.autoApprove ? (
                    <Zap className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Approval Threshold */}
              {config.autoApprove && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 p-3 bg-gray-900/50 rounded-lg"
                >
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Auto-Approve When
                  </div>

                  {/* Severity Threshold */}
                  <div>
                    <div className="text-[10px] text-gray-600 mb-2">
                      Max severity level:
                    </div>
                    <div className="flex gap-1">
                      {SEVERITY_OPTIONS.map((sev) => (
                        <button
                          key={sev.value}
                          onClick={() => handleSeverityChange(sev.value)}
                          className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                            config.approvalThreshold?.severity === sev.value
                              ? 'ring-1'
                              : 'opacity-50'
                          }`}
                          style={{
                            backgroundColor: `${sev.color}20`,
                            color: sev.color,
                            boxShadow: config.approvalThreshold?.severity === sev.value
                              ? `0 0 0 1px ${sev.color}`
                              : undefined,
                          }}
                        >
                          {sev.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max Issues */}
                  <div>
                    <div className="text-[10px] text-gray-600 mb-2">
                      Maximum issues (optional):
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={config.approvalThreshold?.maxIssues || ''}
                      onChange={(e) => handleMaxIssuesChange(
                        e.target.value ? parseInt(e.target.value) : undefined
                      )}
                      placeholder="No limit"
                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-pink-500/50"
                    />
                  </div>
                </motion.div>
              )}

              {/* Description */}
              <div className="text-[10px] text-gray-600 leading-relaxed">
                {config.autoApprove ? (
                  <>
                    Pipeline will automatically continue if all issues are{' '}
                    <span className="text-pink-400">
                      {config.approvalThreshold?.severity || 'high'}
                    </span>{' '}
                    severity or lower
                    {config.approvalThreshold?.maxIssues && (
                      <> and there are at most{' '}
                        <span className="text-pink-400">
                          {config.approvalThreshold.maxIssues}
                        </span>{' '}
                        issues
                      </>
                    )}
                    . Otherwise, manual review is required.
                  </>
                ) : (
                  <>
                    Pipeline will pause for manual review at this point.
                    You'll be able to see all issues and decide whether to continue.
                  </>
                )}
              </div>

              {/* Remove button */}
              {onRemove && (
                <button
                  onClick={onRemove}
                  className="w-full py-2 text-[10px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Remove Decision Gate
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
