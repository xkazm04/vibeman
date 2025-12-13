'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Eye,
  EyeOff,
  XCircle,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Layers,
} from 'lucide-react';
import { DbArchitectureDrift } from '@/app/db/models/architecture-graph.types';

interface DriftsListProps {
  drifts: DbArchitectureDrift[];
  onUpdateStatus: (id: string, status: string) => void;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-red-400' },
  acknowledged: { label: 'Acknowledged', color: 'text-amber-400' },
  resolved: { label: 'Resolved', color: 'text-green-400' },
  ignored: { label: 'Ignored', color: 'text-gray-400' },
};

const DRIFT_TYPE_ICONS: Record<string, typeof GitBranch> = {
  circular_dependency: GitBranch,
  layer_violation: Layers,
};

export default function DriftsList({ drifts, onUpdateStatus }: DriftsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);

  // Filter drifts
  const filteredDrifts = drifts.filter((drift) => {
    if (filterStatus && drift.status !== filterStatus) return false;
    if (filterSeverity && drift.severity !== filterSeverity) return false;
    return true;
  });

  // Group by status
  const activeDrifts = filteredDrifts.filter((d) => d.status === 'active');
  const otherDrifts = filteredDrifts.filter((d) => d.status !== 'active');

  // Counts
  const counts = {
    active: drifts.filter((d) => d.status === 'active').length,
    critical: drifts.filter((d) => d.severity === 'critical' && d.status === 'active').length,
    warning: drifts.filter((d) => d.severity === 'warning' && d.status === 'active').length,
  };

  const DriftItem = ({ drift }: { drift: DbArchitectureDrift }) => {
    const severityConfig = SEVERITY_CONFIG[drift.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
    const SeverityIcon = severityConfig.icon;
    const TypeIcon = DRIFT_TYPE_ICONS[drift.drift_type] || AlertCircle;
    const isExpanded = expandedId === drift.id;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`border rounded-lg overflow-hidden ${severityConfig.bgColor} ${severityConfig.borderColor}`}
        data-testid={`drift-item-${drift.id}`}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : drift.id)}
        >
          <SeverityIcon className={`w-5 h-5 ${severityConfig.color} flex-shrink-0 mt-0.5`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white truncate">{drift.title}</h4>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  STATUS_CONFIG[drift.status as keyof typeof STATUS_CONFIG]?.color || 'text-gray-400'
                } bg-gray-800/50`}
              >
                {STATUS_CONFIG[drift.status as keyof typeof STATUS_CONFIG]?.label || drift.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{drift.description}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <TypeIcon className="w-4 h-4 text-gray-500" />
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-700/50"
            >
              <div className="p-3 space-y-3">
                {/* Details */}
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Type</span>
                    <p className="text-xs text-gray-300">{drift.drift_type.replace(/_/g, ' ')}</p>
                  </div>

                  {drift.detected_pattern && (
                    <div>
                      <span className="text-xs text-gray-500">Detected Pattern</span>
                      <pre className="text-xs text-gray-300 bg-gray-800/50 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(JSON.parse(drift.detected_pattern), null, 2)}
                      </pre>
                    </div>
                  )}

                  {drift.ideal_pattern && (
                    <div>
                      <span className="text-xs text-gray-500">Expected Pattern</span>
                      <pre className="text-xs text-gray-300 bg-gray-800/50 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(JSON.parse(drift.ideal_pattern), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {drift.status === 'active' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(drift.id, 'acknowledged');
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      data-testid={`acknowledge-drift-${drift.id}-btn`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Acknowledge
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(drift.id, 'resolved');
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                      data-testid={`resolve-drift-${drift.id}-btn`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Resolved
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(drift.id, 'ignored');
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-500/10 rounded-lg transition-colors"
                      data-testid={`ignore-drift-${drift.id}-btn`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Ignore
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4" data-testid="drifts-list">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-sm font-medium text-white">{counts.active} Active Drifts</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {counts.critical > 0 && (
            <span className="text-red-400">{counts.critical} critical</span>
          )}
          {counts.warning > 0 && (
            <span className="text-amber-400">{counts.warning} warnings</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={filterStatus || ''}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          data-testid="filter-status-select"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>

        <select
          value={filterSeverity || ''}
          onChange={(e) => setFilterSeverity(e.target.value || null)}
          className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          data-testid="filter-severity-select"
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Active drifts */}
      {activeDrifts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider">Active Issues</h3>
          <AnimatePresence mode="popLayout">
            {activeDrifts.map((drift) => (
              <DriftItem key={drift.id} drift={drift} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Other drifts */}
      {otherDrifts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider">
            Resolved / Acknowledged ({otherDrifts.length})
          </h3>
          <AnimatePresence mode="popLayout">
            {otherDrifts.slice(0, 10).map((drift) => (
              <DriftItem key={drift.id} drift={drift} />
            ))}
          </AnimatePresence>
          {otherDrifts.length > 10 && (
            <p className="text-xs text-gray-500 text-center py-2">
              +{otherDrifts.length - 10} more
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {filteredDrifts.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
          <p className="text-gray-400">No architecture drifts detected</p>
          <p className="text-xs text-gray-500 mt-1">
            {filterStatus || filterSeverity
              ? 'Try adjusting your filters'
              : 'Your architecture is aligned with ideals'}
          </p>
        </div>
      )}
    </div>
  );
}
