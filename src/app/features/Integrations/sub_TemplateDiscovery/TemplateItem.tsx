'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
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
      }`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{
        x: 3,
        transition: { duration: 0.15, ease: 'easeOut' },
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
    </motion.div>
  );
});

export default TemplateItem;
