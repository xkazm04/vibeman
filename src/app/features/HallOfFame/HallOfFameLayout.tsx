'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { FeaturedHero } from './components/FeaturedHero';
import { CategoryTabs } from './components/CategoryTabs';
import { ComponentTable } from './components/ComponentTable';
import { PreviewModal } from './components/PreviewModal';
import { getTotalComponentCount } from './lib/showcaseRegistry';
import type { CategoryId } from './lib/types';

export default function HallOfFameLayout() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('core-ui');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const totalCount = getTotalComponentCount();

  // Fetch starred IDs on mount
  useEffect(() => {
    async function fetchStarred() {
      try {
        const response = await fetch('/api/hall-of-fame/star');
        if (response.ok) {
          const data = await response.json();
          setStarredIds(new Set(data.starredIds));
        }
      } catch (error) {
        console.error('Failed to fetch starred components:', error);
      }
    }
    fetchStarred();
  }, []);

  // Toggle star handler
  const handleToggleStar = useCallback(async (componentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    try {
      const response = await fetch('/api/hall-of-fame/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId }),
      });
      if (response.ok) {
        const data = await response.json();
        setStarredIds(prev => {
          const next = new Set(prev);
          if (data.starred) {
            next.add(componentId);
          } else {
            next.delete(componentId);
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  }, []);

  const handleComponentClick = (componentId: string) => {
    setSelectedComponentId(componentId);
  };

  const handleCloseModal = () => {
    setSelectedComponentId(null);
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Featured Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <FeaturedHero onComponentClick={handleComponentClick} starredIds={starredIds} />
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
              starredIds={starredIds}
              onToggleStar={handleToggleStar}
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
