'use client';
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import SparkleEffect from './components/SparkleEffect';

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
  const prevSuccessCount = useRef(successCount);
  const [showSparkle, setShowSparkle] = React.useState(false);
  const [sparkleKey, setSparkleKey] = React.useState(0);

  // Detect success count increase
  useEffect(() => {
    if (successCount > prevSuccessCount.current && successCount > 0) {
      setShowSparkle(true);
      setSparkleKey(prev => prev + 1);

      // Hide sparkle after animation completes
      const timer = setTimeout(() => {
        setShowSparkle(false);
      }, 700);

      return () => clearTimeout(timer);
    }
    prevSuccessCount.current = successCount;
  }, [successCount]);

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
        <motion.div
          className="relative flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 rounded overflow-visible"
          animate={showSparkle ? {
            scale: [1, 1.3, 1],
            backgroundColor: ['rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.1)'],
          } : {}}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <motion.div
            animate={showSparkle ? {
              scale: [1, 1.2, 1],
              rotate: [0, 15, 0],
            } : {}}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <CheckCircle2 className="w-2.5 h-2.5 text-green-400" />
          </motion.div>
          <motion.span
            className="text-[10px] font-semibold text-green-400"
            key={successCount}
            initial={{ scale: 1 }}
            animate={showSparkle ? {
              scale: [1, 1.4, 1],
            } : {}}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {successCount}
          </motion.span>
          {showSparkle && <SparkleEffect trigger={sparkleKey} />}
        </motion.div>
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 rounded">
          <XCircle className="w-2.5 h-2.5 text-red-400" />
          <span className="text-[10px] font-semibold text-red-400">{failureCount}</span>
        </div>
      </div>
    </div>
  );
}
