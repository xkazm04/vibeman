'use client';

import { motion } from 'framer-motion';
import { useThemeStore } from '@/stores/themeStore';
import MonitorTabs from './components/MonitorTabs';

export default function MonitorPage() {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900/30 to-blue-900/20 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${colors.primary} bg-clip-text text-transparent mb-2 font-mono`}>
            VOICEBOT MONITORING
          </h1>
          <p className={`${colors.text} opacity-60 font-mono`}>
            Track and analyze voicebot call sessions and performance
          </p>
        </motion.div>

        {/* Tabbed Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MonitorTabs />
        </motion.div>
      </div>
    </div>
  );
}
