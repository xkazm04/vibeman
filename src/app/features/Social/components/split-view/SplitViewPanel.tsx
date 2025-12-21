'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import type { SplitViewState, SplitViewWidth } from './splitViewTypes';
import { SPLIT_VIEW_WIDTHS } from './splitViewTypes';
import { SplitViewHeader } from './SplitViewHeader';
import { SplitViewContent } from './SplitViewContent';

interface SplitViewPanelProps {
  state: SplitViewState;
  item: FeedbackItem | null;
  currentIndex: number;
  totalItems: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onWidthChange: (width: SplitViewWidth) => void;
  onAction: (action: string, item: FeedbackItem) => void;
  canPrev: boolean;
  canNext: boolean;
}

export function SplitViewPanel({
  state,
  item,
  currentIndex,
  totalItems,
  onClose,
  onPrev,
  onNext,
  onWidthChange,
  onAction,
  canPrev,
  canNext,
}: SplitViewPanelProps) {
  return (
    <AnimatePresence>
      {state.isOpen && item && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`flex flex-col bg-gray-900 border-l border-gray-700/50
            shadow-2xl shadow-black/20 ${SPLIT_VIEW_WIDTHS[state.width]}
            mt-4 mb-4 mr-4 rounded-lg overflow-hidden max-h-[calc(100%-2rem)]`}
        >
          <SplitViewHeader
            item={item}
            currentIndex={currentIndex}
            totalItems={totalItems}
            width={state.width}
            onClose={onClose}
            onPrev={onPrev}
            onNext={onNext}
            onWidthChange={onWidthChange}
            canPrev={canPrev}
            canNext={canNext}
          />
          <SplitViewContent
            item={item}
            onAction={action => onAction(action, item)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SplitViewPanel;
