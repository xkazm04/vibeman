import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';

// Lazy load the ContextCards component
const ContextCards = lazy(() => import('./ContextCards'));

interface LazyContextCardsProps {
  contexts: any[];
  group?: any;
  availableGroups: any[];
  selectedFilePaths: string[];
  showFullScreenModal: (title: string, content: React.ReactNode, options?: any) => void;
}

const LoadingSpinner = () => (
  <motion.div
    className="flex items-center justify-center py-8"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
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