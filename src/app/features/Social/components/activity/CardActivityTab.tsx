'use client';

import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import { useActivity } from '../../hooks/useActivity';
import { ActivityTimeline } from './ActivityTimeline';

interface CardActivityTabProps {
  item: FeedbackItem;
}

export function CardActivityTab({ item }: CardActivityTabProps) {
  const { filterEvents } = useActivity();

  // Get only events for this specific feedback item
  const itemEvents = filterEvents({ feedbackIds: [item.id] });

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-200 mb-4">Activity History</h3>
      <ActivityTimeline
        events={itemEvents}
        showFeedbackId={false}
        maxItems={20}
      />
    </div>
  );
}

export default CardActivityTab;
