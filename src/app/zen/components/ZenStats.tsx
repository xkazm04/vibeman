'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useZenStore } from '../lib/zenStore';

export default function ZenStats() {
  const { stats } = useZenStore();

  const statItems = [
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
  ];

  return (
    <div className="flex items-center gap-4">
      {statItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`flex flex-col items-center justify-center px-8 py-4 rounded-xl border ${item.bgColor} ${item.borderColor}`}
        >
          <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
          <span className="text-3xl font-light text-white mb-1">
            {item.value}
          </span>
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {item.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
