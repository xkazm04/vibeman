import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { SimpleSpinner } from '@/components/ui';
import { LazyContextCardsProps } from './types';

// Lazy load the ContextCards component
const ContextCards = lazy(() => import('./ContextCards'));

const LoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center py-8"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <SimpleSpinner size="lg" color="cyan" />
  </motion.div>
);

const LazyContextCards = React.memo((props: LazyContextCardsProps) => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ContextCards {...props} />
    </Suspense>
  );
});

LazyContextCards.displayName = 'LazyContextCards';

export default LazyContextCards;