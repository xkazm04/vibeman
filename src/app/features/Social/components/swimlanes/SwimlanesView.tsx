'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import type { SwimlaneData } from './swimlaneTypes';
import { SwimlaneRow } from './SwimlaneRow';

interface SwimlanesViewProps {
  swimlanes: SwimlaneData[];
  isCollapsed: (laneId: string) => boolean;
  onToggleCollapse: (laneId: string) => void;
  onCardClick: (item: FeedbackItem) => void;
  onCardDoubleClick?: (item: FeedbackItem) => void;
  renderCard: (item: FeedbackItem) => React.ReactNode;
}

export function SwimlanesView({
  swimlanes,
  isCollapsed,
  onToggleCollapse,
  onCardClick,
  onCardDoubleClick,
  renderCard,
}: SwimlanesViewProps) {
  if (swimlanes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg">No items to display</p>
          <p className="text-sm mt-1">Adjust your filters or grouping</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
      <AnimatePresence mode="popLayout">
        {swimlanes.map(swimlane => (
          <motion.div
            key={swimlane.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <SwimlaneRow
              swimlane={swimlane}
              isCollapsed={isCollapsed(swimlane.id)}
              onToggle={() => onToggleCollapse(swimlane.id)}
              onCardClick={onCardClick}
              onCardDoubleClick={onCardDoubleClick}
              renderCard={renderCard}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default SwimlanesView;
