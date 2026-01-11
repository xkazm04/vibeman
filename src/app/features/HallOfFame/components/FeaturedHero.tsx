'use client';

import { motion } from 'framer-motion';
import { Star, Zap, ExternalLink } from 'lucide-react';
import { getFeaturedComponents, getCategoryById } from '../lib/showcaseRegistry';
import {
  MotionButtonPreview,
  UniversalSelectPreview,
  DecisionCardPreview,
  StatusChipPreview,
  ModalTransitionPreview,
  IlluminatedButtonPreview,
  StackedBarChartPreview,
} from './previews';

interface FeaturedHeroProps {
  onComponentClick: (componentId: string) => void;
}

const ACCENT_COLORS: Record<string, { border: string; glow: string; bg: string; text: string }> = {
  'motion-button': { border: 'border-cyan-500/40', glow: 'hover:shadow-cyan-500/20', bg: 'from-cyan-500/10', text: 'text-cyan-400' },
  'universal-select': { border: 'border-purple-500/40', glow: 'hover:shadow-purple-500/20', bg: 'from-purple-500/10', text: 'text-purple-400' },
  'decision-card': { border: 'border-amber-500/40', glow: 'hover:shadow-amber-500/20', bg: 'from-amber-500/10', text: 'text-amber-400' },
  'status-chip': { border: 'border-emerald-500/40', glow: 'hover:shadow-emerald-500/20', bg: 'from-emerald-500/10', text: 'text-emerald-400' },
  'modal-transition': { border: 'border-pink-500/40', glow: 'hover:shadow-pink-500/20', bg: 'from-pink-500/10', text: 'text-pink-400' },
  'illuminated-button': { border: 'border-blue-500/40', glow: 'hover:shadow-blue-500/20', bg: 'from-blue-500/10', text: 'text-blue-400' },
  'stacked-bar-chart': { border: 'border-violet-500/40', glow: 'hover:shadow-violet-500/20', bg: 'from-violet-500/10', text: 'text-violet-400' },
};

function getDefaultProps(componentId: string): Record<string, unknown> {
  switch (componentId) {
    case 'motion-button':
      return { colorScheme: 'cyan', variant: 'solid', size: 'md' };
    case 'universal-select':
      return { variant: 'cyber', size: 'md' };
    case 'decision-card':
      return { severity: 'info', size: 'sm' };
    case 'status-chip':
      return { status: 'processing', size: 'md', animated: true };
    case 'modal-transition':
      return { variant: 'spring' };
    case 'illuminated-button':
      return { color: 'cyan', size: 'md', selected: false, scanning: false };
    case 'stacked-bar-chart':
      return { showTotalBadge: true, showAvgBadge: false };
    default:
      return {};
  }
}

function renderComponentPreview(componentId: string) {
  const props = getDefaultProps(componentId);

  switch (componentId) {
    case 'motion-button':
      return <MotionButtonPreview props={props} />;
    case 'universal-select':
      return <UniversalSelectPreview props={props} />;
    case 'decision-card':
      return (
        <div className="scale-[0.85] origin-center">
          <DecisionCardPreview props={props} />
        </div>
      );
    case 'status-chip':
      return <StatusChipPreview props={props} />;
    case 'modal-transition':
      return <ModalTransitionPreview props={props} />;
    case 'illuminated-button':
      return <IlluminatedButtonPreview props={props} />;
    case 'stacked-bar-chart':
      return (
        <div className="w-full max-w-[280px] scale-[0.9] origin-center">
          <StackedBarChartPreview props={props} />
        </div>
      );
    default:
      return null;
  }
}

export function FeaturedHero({ onComponentClick }: FeaturedHeroProps) {
  const featuredComponents = getFeaturedComponents();

  return (
    <div className="mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
          <Star className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Featured Components</h2>
          <p className="text-sm text-gray-400">Live previews - click to explore variants</p>
        </div>
      </div>

      {/* Featured Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {featuredComponents.map((component, index) => {
          const category = getCategoryById(component.categoryId);
          const colors = ACCENT_COLORS[component.id] || ACCENT_COLORS['motion-button'];

          return (
            <motion.div
              key={component.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              onClick={() => onComponentClick(component.id)}
              className={`
                group relative cursor-pointer
                rounded-xl overflow-hidden
                bg-gray-900/60 backdrop-blur-sm
                border ${colors.border}
                shadow-lg ${colors.glow} hover:shadow-xl
                transition-all duration-300
                hover:border-opacity-70
              `}
            >
              {/* Gradient accent at top */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.bg} to-transparent`} />

              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900/40">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-medium text-white">{component.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {component.variantCount && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Zap className="w-3 h-3" />
                      {component.variantCount}
                    </span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Component Preview Area */}
              <div className="relative min-h-[160px] flex items-center justify-center p-6 bg-gray-950/30">
                {/* Subtle grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
                    backgroundSize: '16px 16px'
                  }}
                />

                {/* Live component */}
                <div className="relative z-10 pointer-events-none">
                  {renderComponentPreview(component.id)}
                </div>
              </div>

              {/* Footer with category */}
              <div className="px-4 py-2.5 border-t border-gray-800/30 bg-gray-900/30">
                <div className="flex items-center justify-between">
                  {category && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <category.icon className="w-3 h-3" />
                      {category.name}
                    </span>
                  )}
                  <span className={`text-xs ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    View all variants →
                  </span>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
