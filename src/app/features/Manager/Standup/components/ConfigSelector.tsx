/**
 * ConfigSelector Component
 * Generic dropdown selector for automation config options
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, type LucideIcon } from 'lucide-react';

interface ConfigOption<T> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface ConfigSelectorProps<T extends string | number> {
  label: string;
  options: readonly ConfigOption<T>[] | ConfigOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

export function ConfigSelector<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: ConfigSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/60 hover:bg-gray-700/60 rounded border border-gray-700/50 transition-colors"
      >
        {selected?.icon && <selected.icon className="w-3.5 h-3.5 text-gray-400" />}
        <span className="text-xs text-gray-300">{selected?.label || label}</span>
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[120px]"
            >
              {options.map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-700/50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    option.value === value ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                  }`}
                >
                  {option.icon && <option.icon className="w-3.5 h-3.5" />}
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ConfigSelector;
