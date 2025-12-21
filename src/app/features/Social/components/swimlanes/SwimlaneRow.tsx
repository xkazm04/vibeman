'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import type { SwimlaneData } from './swimlaneTypes';
import { SwimlaneHeader } from './SwimlaneHeader';

interface SwimlaneRowProps {
  swimlane: SwimlaneData;
  isCollapsed: boolean;
  onToggle: () => void;
  onCardClick: (item: FeedbackItem) => void;
  onCardDoubleClick?: (item: FeedbackItem) => void;
  renderCard: (item: FeedbackItem) => React.ReactNode;
}

export function SwimlaneRow({
  swimlane,
  isCollapsed,
  onToggle,
  onCardClick,
  onCardDoubleClick,
  renderCard,
}: SwimlaneRowProps) {
  return (
    <div className="space-y-2">
      <SwimlaneHeader
        label={swimlane.label}
        count={swimlane.count}
        color={swimlane.color}
        icon={swimlane.icon}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
      />

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar px-1">
              {swimlane.items.map(item => (
                <div
                  key={item.id}
                  onClick={() => onCardClick(item)}
                  onDoubleClick={onCardDoubleClick ? () => onCardDoubleClick(item) : undefined}
                  className="flex-shrink-0 w-[300px] cursor-pointer"
                >
                  {renderCard(item)}
                </div>
              ))}

              {swimlane.items.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-8
                  text-gray-500 text-sm">
                  No items in this group
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SwimlaneRow;
