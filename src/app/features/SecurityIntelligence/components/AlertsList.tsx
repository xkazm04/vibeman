'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Bell,
  Check,
  X,
} from 'lucide-react';
import type { SecurityAlert } from '@/app/db/models/security-intelligence.types';

interface AlertsListProps {
  alerts: SecurityAlert[];
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  maxItems?: number;
}

/**
 * AlertsList - Display security alerts with action buttons
 */
export default function AlertsList({
  alerts,
  onAcknowledge,
  onResolve,
  maxItems = 10,
}: AlertsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const severityConfig = {
    critical: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
    high: { icon: AlertTriangle, color: 'text-orange-400', bgColor: 'bg-orange-400/10', borderColor: 'border-orange-400/30' },
    medium: { icon: AlertCircle, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', borderColor: 'border-yellow-400/30' },
    low: { icon: Bell, color: 'text-blue-400', bgColor: 'bg-blue-400/10', borderColor: 'border-blue-400/30' },
    info: { icon: CheckCircle, color: 'text-gray-400', bgColor: 'bg-gray-400/10', borderColor: 'border-gray-400/30' },
  };

  const displayAlerts = alerts.slice(0, maxItems);

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500" data-testid="alerts-list-empty">
        <CheckCircle className="w-12 h-12 mb-3 text-green-400" />
        <p className="text-lg">No pending alerts</p>
        <p className="text-sm">All security issues have been addressed</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="alerts-list">
      <AnimatePresence>
        {displayAlerts.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;
          const isExpanded = expandedId === alert.id;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`border rounded-lg p-3 ${config.bgColor} ${config.borderColor}`}
              data-testid={`alert-item-${alert.id}`}
            >
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
              >
                <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-white truncate">
                      {alert.title}
                    </h4>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {alert.alertType.replace(/_/g, ' ')} • {new Date(alert.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!alert.acknowledged && (
                  <div className="flex gap-1">
                    {onAcknowledge && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcknowledge(alert.id);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        title="Acknowledge"
                        data-testid={`acknowledge-btn-${alert.id}`}
                      >
                        <Check className="w-4 h-4 text-green-400" />
                      </button>
                    )}
                    {onResolve && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolve(alert.id);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        title="Resolve"
                        data-testid={`resolve-btn-${alert.id}`}
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-sm text-gray-300">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Source: {alert.source}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {alerts.length > maxItems && (
        <p className="text-center text-sm text-gray-500 pt-2">
          +{alerts.length - maxItems} more alerts
        </p>
      )}
    </div>
  );
}
