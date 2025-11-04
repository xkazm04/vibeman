'use client';

import { motion } from 'framer-motion';
import { Calendar, X } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}

export default function DateRangeFilter({ startDate, endDate, onChange }: DateRangeFilterProps) {
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleStartChange = (value: string) => {
    const newStart = value ? new Date(value) : null;
    onChange(newStart, endDate);
  };

  const handleEndChange = (value: string) => {
    const newEnd = value ? new Date(value) : null;
    onChange(startDate, newEnd);
  };

  const clearDates = () => {
    onChange(null, null);
  };

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    onChange(start, end);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Date Range
        </label>
        {(startDate || endDate) && (
          <button
            onClick={clearDates}
            className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors flex items-center space-x-1"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Quick Range Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <motion.button
          onClick={() => setQuickRange(7)}
          className="px-2 py-1.5 text-sm bg-gray-800/40 text-gray-400 border border-gray-700/40 rounded-lg hover:bg-gray-800/60 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          7 Days
        </motion.button>
        <motion.button
          onClick={() => setQuickRange(30)}
          className="px-2 py-1.5 text-sm bg-gray-800/40 text-gray-400 border border-gray-700/40 rounded-lg hover:bg-gray-800/60 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          30 Days
        </motion.button>
        <motion.button
          onClick={() => setQuickRange(90)}
          className="px-2 py-1.5 text-sm bg-gray-800/40 text-gray-400 border border-gray-700/40 rounded-lg hover:bg-gray-800/60 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          90 Days
        </motion.button>
      </div>

      {/* Custom Date Inputs */}
      <div className="space-y-2">
        <div className="relative">
          <label className="text-sm text-gray-500 mb-1 block">Start Date</label>
          <Calendar className="absolute left-3 top-8 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="date"
            value={formatDateForInput(startDate)}
            onChange={(e) => handleStartChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-800/40 border border-gray-700/40 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-yellow-500/40 transition-all"
          />
        </div>
        <div className="relative">
          <label className="text-sm text-gray-500 mb-1 block">End Date</label>
          <Calendar className="absolute left-3 top-8 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="date"
            value={formatDateForInput(endDate)}
            onChange={(e) => handleEndChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-800/40 border border-gray-700/40 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-yellow-500/40 transition-all"
          />
        </div>
      </div>
    </div>
  );
}
