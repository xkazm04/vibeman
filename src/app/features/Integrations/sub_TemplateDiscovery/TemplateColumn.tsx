'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { DbDiscoveredTemplate } from '../../../db/models/types';
import TemplateItem from './TemplateItem';

interface TemplateColumnProps {
  category: string;
  templates: DbDiscoveredTemplate[];
  selectedTemplateId: string | null;
  onTemplateClick: (templateId: string) => void;
}

/**
 * Format category name for display
 * "research" -> "Research"
 * "general" -> "General"
 */
function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

const TemplateColumn = React.memo(function TemplateColumn({
  category,
  templates,
  selectedTemplateId,
  onTemplateClick,
}: TemplateColumnProps) {
  // Sort templates alphabetically by name
  const sortedTemplates = React.useMemo(() => {
    return [...templates].sort((a, b) =>
      a.template_name.localeCompare(b.template_name)
    );
  }, [templates]);

  return (
    <motion.div
      className="flex flex-col bg-gradient-to-b from-gray-900/50 to-gray-900/30 border border-gray-700/40 rounded-lg overflow-hidden transition-all duration-300 ease-out hover:border-gray-600/60 hover:bg-gray-900/50 hover:shadow-xl hover:shadow-black/30 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
      data-testid={`template-column-${category}`}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700/40 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">
            {formatCategoryName(category)}
          </h3>
          <span className="text-[10px] text-gray-500 font-mono">
            {templates.length}
          </span>
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 px-2 py-2 space-y-1 min-h-[100px] max-h-[400px] overflow-y-auto custom-scrollbar scroll-smooth">
        {sortedTemplates.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-gray-600">
            No templates
          </div>
        ) : (
          sortedTemplates.map((template) => (
            <TemplateItem
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onClick={() => onTemplateClick(template.id)}
            />
          ))
        )}
      </div>
    </motion.div>
  );
});

export default TemplateColumn;
