'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useZenStore, ActivityItem } from '../lib/zenStore';

function ActivityIcon({ status }: { status: ActivityItem['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-400" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ZenTaskFeed() {
  const { recentActivity, currentTask } = useZenStore();

  return (
    <div className="flex-1 flex flex-col">
      {/* Current Task */}
      {currentTask && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-6 bg-gray-800/40 rounded-xl border border-gray-700/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            <span className="text-xs text-cyan-400 uppercase tracking-wider">
              Currently Running
            </span>
          </div>
          <h3 className="text-lg text-white mb-3 font-medium">
            {currentTask.title}
          </h3>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${currentTask.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-sm text-gray-500 mt-2 inline-block">
            {currentTask.progress}% complete
          </span>
        </motion.div>
      )}

      {/* Activity Feed */}
      <div className="flex-1 overflow-hidden">
        <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-4">
          Recent Activity
        </h4>
        <div className="h-full overflow-y-auto pr-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {recentActivity.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-600 text-sm py-8 text-center"
              >
                No activity yet. Select a batch to start monitoring.
              </motion.div>
            ) : (
              recentActivity.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-start gap-3 py-2 px-3 rounded-lg ${
                    item.status === 'failed' ? 'bg-red-500/5' : ''
                  }`}
                >
                  <ActivityIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.title}</p>
                    {item.error && (
                      <p className="text-xs text-red-400 mt-0.5 truncate">
                        {item.error}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {formatTime(item.timestamp)}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
