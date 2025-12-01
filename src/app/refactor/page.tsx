'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { useThemeStore } from '@/stores/themeStore';

// Lazy load the entire wizard layout
const RefactorWizardLayout = dynamic(
  () => import('@/app/features/RefactorWizard/RefactorWizardLayout'),
  {
    loading: () => <WizardLoadingSkeleton />,
    ssr: false
  }
);

function WizardLoadingSkeleton() {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex"
      data-testid="wizard-loading-skeleton"
    >
      {/* Sidebar skeleton */}
      <div className={`w-64 ${colors.bg} border-r ${colors.border} p-6`}>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`h-10 ${colors.bgHover} rounded-lg shimmer-skeleton`}
            />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`h-12 w-64 ${colors.bgHover} rounded-lg shimmer-skeleton mb-8`}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`h-96 ${colors.bgHover} rounded-xl shimmer-skeleton`}
        />
      </div>
    </motion.div>
  );
}

export default function RefactorPage() {
  return (
    <Suspense fallback={<WizardLoadingSkeleton />}>
      <RefactorWizardLayout />
    </Suspense>
  );
}
