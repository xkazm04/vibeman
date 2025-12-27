'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ComponentCard } from './ComponentCard';
import type { ShowcaseComponent, CategoryId } from '../lib/types';
import { getComponentsByCategory } from '../lib/showcaseRegistry';

interface ComponentGridProps {
  categoryId: CategoryId;
  onComponentClick: (componentId: string) => void;
}

export function ComponentGrid({ categoryId, onComponentClick }: ComponentGridProps) {
  const components = getComponentsByCategory(categoryId);

  if (components.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No components in this category yet.
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1"
    >
      <AnimatePresence mode="popLayout">
        {components.map((component, index) => (
          <ComponentCard
            key={component.id}
            component={component}
            onClick={() => onComponentClick(component.id)}
            index={index}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
