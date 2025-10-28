'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export type VibemanStatusType = 'idle' | 'evaluating' | 'generating' | 'executing' | 'success' | 'error';

interface VibemanStatusProps {
  status: VibemanStatusType;
  message?: string;
  successCount: number;
  failureCount: number;
}

export default function VibemanStatus({
  status,
  message,
  successCount,
  failureCount,
}: VibemanStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'evaluating':
      case 'generating':
      case 'executing':
        return <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-3.5 h-3.5 flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'evaluating':
        return 'text-blue-400';
      case 'generating':
        return 'text-purple-400';
      case 'executing':
        return 'text-amber-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const statusColor = getStatusColor();
  const statusIcon = getStatusIcon();

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {/* Status with icon */}
      <motion.div
        key={status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-1.5 flex-1 min-w-0"
      >
        {statusIcon && <span className={statusColor}>{statusIcon}</span>}
        <span className={`text-sm w-[250px] font-medium ${statusColor} truncate`}>
          {message || 'Ready'}
        </span>
      </motion.div>

      {/* Compact Counters */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 rounded">
          <CheckCircle2 className="w-2.5 h-2.5 text-green-400" />
          <span className="text-[10px] font-semibold text-green-400">{successCount}</span>
        </div>
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 rounded">
          <XCircle className="w-2.5 h-2.5 text-red-400" />
          <span className="text-[10px] font-semibold text-red-400">{failureCount}</span>
        </div>
      </div>
    </div>
  );
}
