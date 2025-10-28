'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, Sparkles } from 'lucide-react';

interface StatusFilterProps {
  selectedStatuses: string[];
  onChange: (statuses: string[]) => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'blue' },
  { value: 'accepted', label: 'Accepted', icon: CheckCircle2, color: 'green' },
  { value: 'implemented', label: 'Implemented', icon: Sparkles, color: 'yellow' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'red' },
];

export default function StatusFilter({ selectedStatuses, onChange }: StatusFilterProps) {
  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onChange([...selectedStatuses, status]);
    }
  };

  const toggleAll = () => {
    if (selectedStatuses.length === STATUS_OPTIONS.length) {
      onChange([]);
    } else {
      onChange(STATUS_OPTIONS.map((s) => s.value));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Status
        </label>
        <button
          onClick={toggleAll}
          className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          {selectedStatuses.length === STATUS_OPTIONS.length ? 'Clear All' : 'Select All'}
        </button>
      </div>
      <div className="space-y-1.5">
        {STATUS_OPTIONS.map((status) => {
          const isSelected = selectedStatuses.includes(status.value);
          const Icon = status.icon;

          return (
            <motion.button
              key={status.value}
              onClick={() => toggleStatus(status.value)}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all ${
                isSelected
                  ? `bg-${status.color}-500/20 text-${status.color}-300 border border-${status.color}-500/40`
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{status.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
