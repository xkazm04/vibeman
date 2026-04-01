/**
 * Decision Panel
 * Displays notifications as actionable decision cards (right 1/3 of Commander)
 */

'use client';

import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { ScrollShadow } from '@/components/ui';
import EmptyState from '@/components/ui/EmptyState';
import { useAnnetteNotificationStore } from '@/stores/annette/notificationStore';
import DecisionCard from './DecisionCard';

export default function DecisionPanel() {
  const notifications = useAnnetteNotificationStore((s) => s.notifications);
  const snoozedIds = useAnnetteNotificationStore((s) => s.snoozedIds);
  const snoozeExpiry = useAnnetteNotificationStore((s) => s.snoozeExpiry);

  const activeNotifications = useMemo(() => {
    const now = Date.now();
    const activeSnoozed = snoozedIds.filter(id => (snoozeExpiry[id] || 0) > now);
    return notifications.filter(n => !activeSnoozed.includes(n.id));
  }, [notifications, snoozedIds, snoozeExpiry]);

  return (
    <div className="flex flex-col h-full border-l border-slate-800/50">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-800/50">
        <h3 className="text-sm font-medium text-slate-200">Decisions</h3>
        {activeNotifications.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
            {activeNotifications.length}
          </span>
        )}
      </div>

      {/* Cards */}
      <ScrollShadow className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence mode="popLayout">
          {activeNotifications.map((n) => (
            <DecisionCard key={n.id} notification={n} />
          ))}
        </AnimatePresence>

        {activeNotifications.length === 0 && (
          <EmptyState
            icon={CheckCircle2}
            title="No pending decisions"
            description="Notifications will appear here as actionable cards"
            variant="compact"
            className="h-full"
          />
        )}
      </ScrollShadow>
    </div>
  );
}
