'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, ClipboardCheck, MessageSquare } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import type { OverviewTab } from '@/app/features/Personas/lib/types';
import GlobalExecutionList from './GlobalExecutionList';
import ManualReviewList from './ManualReviewList';
import MessageList from './MessageList';
import UsageDashboard from './UsageDashboard';

const tabs: Array<{ id: OverviewTab; label: string; icon: typeof Activity }> = [
  { id: 'executions', label: 'Executions', icon: Activity },
  { id: 'manual-review', label: 'Manual Review', icon: ClipboardCheck },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
];

export default function OverviewPage() {
  const overviewTab = usePersonaStore((s) => s.overviewTab);
  const setOverviewTab = usePersonaStore((s) => s.setOverviewTab);
  const pendingReviewCount = usePersonaStore((s) => s.pendingReviewCount);
  const fetchPendingReviewCount = usePersonaStore((s) => s.fetchPendingReviewCount);
  const unreadMessageCount = usePersonaStore((s) => s.unreadMessageCount);
  const fetchUnreadMessageCount = usePersonaStore((s) => s.fetchUnreadMessageCount);

  useEffect(() => {
    fetchPendingReviewCount();
    fetchUnreadMessageCount();
  }, [fetchPendingReviewCount, fetchUnreadMessageCount]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-center gap-1.5 p-1 bg-secondary/50 backdrop-blur-md rounded-xl w-fit border border-primary/20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = overviewTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setOverviewTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="overviewTabIndicator"
                    className="absolute inset-0 bg-background rounded-lg shadow-sm border border-primary/20"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className="relative z-10 w-4 h-4" />
                <span className="relative z-10">{tab.label}</span>
                {tab.id === 'manual-review' && pendingReviewCount > 0 && (
                  <span className="relative z-10 ml-1 px-1.5 py-0.5 text-[10px] font-bold leading-none rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {pendingReviewCount}
                  </span>
                )}
                {tab.id === 'messages' && unreadMessageCount > 0 && (
                  <span className="relative z-10 ml-1 px-1.5 py-0.5 text-[10px] font-bold leading-none rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {unreadMessageCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={overviewTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 overflow-hidden"
      >
        {overviewTab === 'executions' ? <GlobalExecutionList /> :
         overviewTab === 'manual-review' ? <ManualReviewList /> :
         overviewTab === 'messages' ? <MessageList /> :
         overviewTab === 'usage' ? <UsageDashboard /> :
         <MessageList />}
      </motion.div>
    </div>
  );
}
