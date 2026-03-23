'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, AlertCircle } from 'lucide-react';
import { duration, easing } from '@/lib/motion';
import type { DbDiscoveredTemplate } from '../../../db/models/types';

interface TemplateItemProps {
  template: DbDiscoveredTemplate;
  isSelected: boolean;
  onClick: () => void;
}

const TemplateItem = React.memo(function TemplateItem({
  template,
  isSelected,
  onClick,
}: TemplateItemProps) {
  const isStale = template.status === 'stale';
  const isError = template.status === 'error';

  return (
    <motion.div
      data-testid={`template-item-${template.id}`}
      tabIndex={0}
      role="button"
      aria-label={template.template_name}
      aria-pressed={isSelected}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 ${
        isSelected
          ? 'border-cyan-500/50 bg-cyan-900/20 focus-visible:ring-cyan-400/70'
          : 'border-gray-600/40 bg-gray-800/20 hover:bg-gray-700/40 hover:border-gray-500/60 focus-visible:ring-blue-400/70'
      } ${isStale ? 'opacity-60' : ''}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: isStale ? 0.6 : 1, x: 0 }}
      whileHover={{
        x: 3,
        transition: { duration: duration.snappy, ease: easing.entrance },
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Icon */}
      <FileText className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />

      {/* Title */}
      <span className="flex-1 min-w-0 text-xs text-gray-200 truncate font-medium">
        {template.template_name}
      </span>

      {/* Status badges */}
      {isStale && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex-shrink-0">
          <Clock className="w-3 h-3" />
          Stale
        </span>
      )}
      {isError && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0"
          title={template.parse_error || 'Parse error'}
        >
          <AlertCircle className="w-3 h-3" />
          Error
        </span>
      )}
    </motion.div>
  );
});

export default TemplateItem;
