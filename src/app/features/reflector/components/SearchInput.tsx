'use client';

import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search ideas...' }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-10 pr-10 py-2 bg-gray-800/40 border border-gray-700/40 rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-yellow-500/40 focus:bg-gray-800/60 focus-visible:ring-2 focus-visible:ring-yellow-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-all"
      />
      {value && (
        <motion.button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-yellow-500/50 outline-none rounded"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
