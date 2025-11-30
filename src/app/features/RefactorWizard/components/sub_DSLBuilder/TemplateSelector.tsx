'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpCircle,
  Trash2,
  Shield,
  Zap,
  Layout,
  Sparkles,
  Check,
} from 'lucide-react';
import { CyberCard } from '@/components/ui/wizard';
import { RefactorTemplate } from '../../lib/dslTypes';

interface TemplateSelectorProps {
  templates: RefactorTemplate[];
  onSelect: (template: RefactorTemplate) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  migration: { icon: ArrowUpCircle, color: 'blue', label: 'Migration' },
  cleanup: { icon: Trash2, color: 'green', label: 'Cleanup' },
  security: { icon: Shield, color: 'red', label: 'Security' },
  performance: { icon: Zap, color: 'yellow', label: 'Performance' },
  architecture: { icon: Layout, color: 'purple', label: 'Architecture' },
};

/**
 * TemplateSelector - Grid of predefined refactoring templates
 */
export default function TemplateSelector({ templates, onSelect }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const categories = ['all', ...Object.keys(CATEGORY_CONFIG)];

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => {
          const isAll = cat === 'all';
          const config = !isAll ? CATEGORY_CONFIG[cat] : null;
          const Icon = config?.icon || Sparkles;
          const isActive = selectedCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-all ${
                isActive
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              data-testid={`template-category-${cat}`}
            >
              {!isAll && <Icon className="w-4 h-4" />}
              {isAll ? 'All' : config?.label}
            </button>
          );
        })}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map((template, index) => {
            const config = CATEGORY_CONFIG[template.category];
            const Icon = config?.icon || Sparkles;
            const isHovered = hoveredTemplate === template.id;

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <CyberCard
                  variant={isHovered ? 'glow' : 'default'}
                  hover
                  onClick={() => onSelect(template)}
                  data-testid={`template-card-${template.id}`}
                >
                  <div
                    onMouseEnter={() => setHoveredTemplate(template.id)}
                    onMouseLeave={() => setHoveredTemplate(null)}
                    className="space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-${config?.color || 'cyan'}-500/10 border border-${config?.color || 'cyan'}-500/30`}>
                        <Icon className={`w-5 h-5 text-${config?.color || 'cyan'}-400`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">{template.name}</h4>
                        <p className="text-gray-400 text-sm line-clamp-2">{template.description}</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-black/30 border border-white/10 rounded text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 4 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">
                          +{template.tags.length - 4}
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {template.spec.transformations?.length || 0} transformation{(template.spec.transformations?.length || 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded ${
                          template.spec.metadata?.effort === 'small' ? 'bg-green-500/10 text-green-400' :
                          template.spec.metadata?.effort === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                          template.spec.metadata?.effort === 'large' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {template.spec.metadata?.effort || 'medium'} effort
                        </span>
                      </span>
                    </div>

                    {/* Use button - appears on hover */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="flex justify-end"
                        >
                          <span className="flex items-center gap-1 text-sm text-cyan-400">
                            <Check className="w-4 h-4" />
                            Use this template
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CyberCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No templates in this category</p>
        </div>
      )}
    </div>
  );
}
