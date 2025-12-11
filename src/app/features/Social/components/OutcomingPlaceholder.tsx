'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';

export default function OutcomingPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-full blur-2xl" />
        <div className="relative p-6 rounded-2xl bg-gray-800/40 border border-gray-700/40">
          <Send className="w-16 h-16 text-blue-400" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Outcoming Feature</h2>
      <p className="text-gray-400 max-w-md mb-6">
        This feature will allow you to send proactive messages, announcements, and updates
        to your social media channels directly from Vibeman.
      </p>

      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-purple-300">Coming Soon</span>
      </div>
    </motion.div>
  );
}
