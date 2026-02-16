'use client';

import { motion } from 'framer-motion';
import { usePersonaStore } from '@/stores/personaStore';
import GlobalExecutionList from './GlobalExecutionList';
import ManualReviewList from './ManualReviewList';
import MessageList from './MessageList';
import EventLogList from './EventLogList';
import UsageDashboard from './UsageDashboard';
import ObservabilityDashboard from './ObservabilityDashboard';
import RealtimeVisualizerPage from './RealtimeVisualizerPage';
import MemoriesPage from './MemoriesPage';

export default function OverviewPage() {
  const overviewTab = usePersonaStore((s) => s.overviewTab);

  return (
    <motion.div
      key={overviewTab}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 h-full overflow-hidden"
    >
      {overviewTab === 'executions' ? <GlobalExecutionList /> :
       overviewTab === 'manual-review' ? <ManualReviewList /> :
       overviewTab === 'messages' ? <MessageList /> :
       overviewTab === 'events' ? <EventLogList /> :
       overviewTab === 'usage' ? <UsageDashboard /> :
       overviewTab === 'observability' ? <ObservabilityDashboard /> :
       overviewTab === 'realtime' ? <RealtimeVisualizerPage /> :
       overviewTab === 'memories' ? <MemoriesPage /> :
       <GlobalExecutionList />}
    </motion.div>
  );
}
