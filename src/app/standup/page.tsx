'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Bot } from 'lucide-react';
import { StandupDashboard } from '@/app/features/DailyStandup/components';

export default function StandupPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <ClipboardList className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                Daily Standup
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs">
                  <Bot className="w-3 h-3" />
                  AI-Powered
                </span>
              </h1>
              <p className="text-sm text-gray-400">
                Automated standup summaries from implementation logs and scan results
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <StandupDashboard />
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-600 py-8">
        Summaries generated from implementation logs, ideas, and scan results using AI
      </footer>
    </div>
  );
}
