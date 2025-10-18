'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import MonitorStatistics from './MonitorStatistics';
import MonitorCallsTable from './MonitorCallsTable';
import MonitorReviewTable from './MonitorReviewTable';
import MonitorPatternsTable from './MonitorPatternsTable';
import { BarChart3, Search } from 'lucide-react';

export default function MonitorTabs() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'review'>('monitor');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 bg-gray-900/50 p-2 rounded-xl border border-cyan-500/20">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono text-sm uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'monitor'
              ? 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 text-cyan-300'
              : 'bg-transparent border border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Monitor
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono text-sm uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'review'
              ? 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 text-cyan-300'
              : 'bg-transparent border border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Search className="w-4 h-4" />
          Review
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'monitor' ? (
        <motion.div
          key="monitor"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MonitorStatistics />
          <MonitorCallsTable />
        </motion.div>
      ) : (
        <motion.div
          key="review"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <MonitorReviewTable />
          <MonitorPatternsTable />
        </motion.div>
      )}
    </div>
  );
}
