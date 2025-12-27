'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import { FeaturedHero } from './components/FeaturedHero';
import { CategoryTabs } from './components/CategoryTabs';
import { ComponentTable } from './components/ComponentTable';
import { PreviewModal } from './components/PreviewModal';
import { getTotalComponentCount } from './lib/showcaseRegistry';
import type { CategoryId } from './lib/types';

export default function HallOfFameLayout() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('core-ui');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  const totalCount = getTotalComponentCount();

  const handleComponentClick = (componentId: string) => {
    setSelectedComponentId(componentId);
  };

  const handleCloseModal = () => {
    setSelectedComponentId(null);
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <Trophy className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Hall of Fame
              </h1>
              <p className="text-gray-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Showcase of best component concepts</span>
                <span className="px-2 py-0.5 text-xs bg-gray-800/60 text-gray-500 rounded-full ml-2">
                  {totalCount} components
                </span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Featured Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <FeaturedHero onComponentClick={handleComponentClick} />
        </motion.div>

        {/* Category Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-white">Browse by Category</h2>
          </div>

          {/* Tabs */}
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Table */}
          <div className="mt-6">
            <ComponentTable
              categoryId={activeCategory}
              onComponentClick={handleComponentClick}
            />
          </div>
        </motion.div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        componentId={selectedComponentId}
        onClose={handleCloseModal}
      />
    </div>
  );
}
