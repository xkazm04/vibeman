'use client';

import { motion } from 'framer-motion';
import { Star, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { getFeaturedComponents, getCategoryById } from '../lib/showcaseRegistry';

interface FeaturedHeroProps {
  onComponentClick: (componentId: string) => void;
}

const FEATURED_GRADIENTS = [
  'from-cyan-600/30 via-blue-600/20 to-purple-600/30',
  'from-purple-600/30 via-pink-600/20 to-red-600/30',
  'from-amber-600/30 via-orange-600/20 to-red-600/30',
  'from-emerald-600/30 via-teal-600/20 to-cyan-600/30',
];

const FEATURED_BORDERS = [
  'border-cyan-500/50',
  'border-purple-500/50',
  'border-amber-500/50',
  'border-emerald-500/50',
];

const FEATURED_GLOWS = [
  'shadow-cyan-500/20',
  'shadow-purple-500/20',
  'shadow-amber-500/20',
  'shadow-emerald-500/20',
];

export function FeaturedHero({ onComponentClick }: FeaturedHeroProps) {
  const featuredComponents = getFeaturedComponents();

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
          <Star className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Featured Components</h2>
          <p className="text-sm text-gray-400">Best of the best - interactive showcases</p>
        </div>
      </div>

      {/* Featured Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {featuredComponents.map((component, index) => {
          const category = getCategoryById(component.categoryId);
          const gradient = FEATURED_GRADIENTS[index % FEATURED_GRADIENTS.length];
          const border = FEATURED_BORDERS[index % FEATURED_BORDERS.length];
          const glow = FEATURED_GLOWS[index % FEATURED_GLOWS.length];

          return (
            <motion.div
              key={component.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.03, y: -8 }}
              onClick={() => onComponentClick(component.id)}
              className={`
                group relative cursor-pointer
                rounded-2xl overflow-hidden
                bg-gradient-to-br ${gradient}
                border ${border}
                shadow-xl hover:shadow-2xl ${glow}
                backdrop-blur-xl
                transition-all duration-300
              `}
            >
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:200%_200%] animate-shimmer" />
              </div>

              {/* Content */}
              <div className="relative p-6">
                {/* Icon + Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/10 text-white/80 rounded-full">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    Featured
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-200 transition-colors">
                  {component.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-white/70 mb-4 line-clamp-2">
                  {component.description}
                </p>

                {/* Stats row */}
                <div className="flex items-center justify-between">
                  {component.variantCount && (
                    <span className="flex items-center gap-1 text-xs text-white/60">
                      <Zap className="w-3 h-3" />
                      {component.variantCount} variants
                    </span>
                  )}
                  {category && (
                    <span className="text-xs text-white/50">
                      {category.name}
                    </span>
                  )}
                </div>

                {/* Hover action */}
                <div className="absolute bottom-6 right-6 flex items-center gap-1 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs">Explore</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* Bottom glow line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
