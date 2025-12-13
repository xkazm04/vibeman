'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle } from 'lucide-react';
import type { DbTechDebt, RemediationPlan, TechDebtStatus } from '@/app/db/models/tech-debt.types';

interface TechDebtDetailModalProps {
  techDebt: DbTechDebt;
  onClose: () => void;
  onUpdate: () => void;
}

interface StatusBadgeProps {
  label: string;
  colorClasses: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ label, colorClasses }) => (
  <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${colorClasses}`}>
    {label}
  </span>
);

const getSeverityClasses = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border border-red-500/50';
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border border-orange-500/50';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
    default:
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
  }
};

export default function TechDebtDetailModal({
  techDebt,
  onClose,
  onUpdate
}: TechDebtDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const remediationPlan: RemediationPlan | null = techDebt.remediation_plan
    ? JSON.parse(techDebt.remediation_plan)
    : null;

  const filePaths: string[] = techDebt.file_paths ? JSON.parse(techDebt.file_paths) : [];

  const updateStatus = async (newStatus: TechDebtStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/tech-debt', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: techDebt.id,
          status: newStatus
        })
      });

      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      // Error updating tech debt
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden
            bg-gradient-to-br from-gray-900 to-gray-800
            border-2 border-gray-700/50 rounded-xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-700/50">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge
                  label={techDebt.severity}
                  colorClasses={getSeverityClasses(techDebt.severity)}
                />
                <StatusBadge
                  label={techDebt.category.replace('_', ' ')}
                  colorClasses="bg-gray-700/50 text-gray-300 border border-gray-600/50 capitalize"
                />
                <StatusBadge
                  label={`Risk: ${techDebt.risk_score}`}
                  colorClasses="bg-purple-500/20 text-purple-400 border border-purple-500/50"
                />
              </div>
              <h2 className="text-2xl font-bold text-white">{techDebt.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Description</h3>
              <p className="text-gray-300">{techDebt.description}</p>
            </div>

            {/* Impact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Technical Impact</h3>
                <p className="text-gray-300 text-sm">{techDebt.technical_impact || 'Not specified'}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Business Impact</h3>
                <p className="text-gray-300 text-sm">{techDebt.business_impact || 'Not specified'}</p>
              </div>
            </div>

            {/* Affected Files */}
            {filePaths.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">
                  Affected Files ({filePaths.length})
                </h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {filePaths.map((path, idx) => (
                    <div key={idx} className="text-sm text-gray-400 font-mono bg-gray-900/50 px-3 py-1 rounded">
                      {path}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remediation Plan */}
            {remediationPlan && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Remediation Plan</h3>
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                    <div className="text-sm text-gray-400 mb-1">Summary</div>
                    <div className="text-gray-300">{remediationPlan.summary}</div>
                  </div>

                  {/* Effort */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-gray-400">
                      Estimated Effort: <span className="text-white font-medium">{remediationPlan.estimatedEffort}h</span>
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <div className="text-sm font-medium text-gray-400 mb-2">Steps</div>
                    <div className="space-y-2">
                      {remediationPlan.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400
                            flex items-center justify-center text-xs font-bold">
                            {step.order}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white mb-1">{step.title}</div>
                            <div className="text-xs text-gray-400 mb-1">{step.description}</div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{step.estimatedMinutes} min</span>
                              <span>•</span>
                              <span>Validate: {step.validation}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Testing Strategy */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                    <div className="text-sm text-gray-400 mb-1">Testing Strategy</div>
                    <div className="text-sm text-gray-300">{remediationPlan.testingStrategy}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700/50 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              <span className="text-sm font-medium text-white capitalize">
                {techDebt.status.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {techDebt.status === 'detected' && (
                <button
                  onClick={() => updateStatus('acknowledged')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30
                    border border-blue-500/50 rounded-lg text-blue-400
                    text-sm font-medium transition-all disabled:opacity-50"
                >
                  Acknowledge
                </button>
              )}

              {(techDebt.status === 'acknowledged' || techDebt.status === 'detected') && (
                <button
                  onClick={() => updateStatus('planned')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30
                    border border-purple-500/50 rounded-lg text-purple-400
                    text-sm font-medium transition-all disabled:opacity-50"
                >
                  Plan Remediation
                </button>
              )}

              {techDebt.status === 'planned' && (
                <button
                  onClick={() => updateStatus('in_progress')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30
                    border border-amber-500/50 rounded-lg text-amber-400
                    text-sm font-medium transition-all disabled:opacity-50"
                >
                  Start Work
                </button>
              )}

              {techDebt.status === 'in_progress' && (
                <button
                  onClick={() => updateStatus('resolved')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30
                    border border-green-500/50 rounded-lg text-green-400
                    text-sm font-medium transition-all disabled:opacity-50
                    flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Resolved
                </button>
              )}

              {techDebt.status !== 'resolved' && techDebt.status !== 'dismissed' && (
                <button
                  onClick={() => updateStatus('dismissed')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700
                    border border-gray-600 rounded-lg text-gray-400
                    text-sm font-medium transition-all disabled:opacity-50
                    flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
