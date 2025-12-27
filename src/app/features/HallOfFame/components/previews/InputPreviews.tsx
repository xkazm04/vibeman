'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { PreviewProps } from './types';

export function UniversalSelectPreview({ props }: PreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const variant = (props.variant as string) || 'default';

  const variantStyles: Record<string, string> = {
    default: 'bg-gray-800/60 border-gray-700/40',
    cyber: 'bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40 border-cyan-500/30',
    minimal: 'bg-transparent border-0 border-b-2 border-slate-600/50 rounded-none',
    compact: 'bg-gray-800/40 border-gray-700/40',
  };

  return (
    <div className="relative w-full max-w-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border ${variantStyles[variant]} text-gray-200`}
      >
        <span>Select option...</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700/50 rounded-lg overflow-hidden shadow-xl z-10"
          >
            {['React', 'Vue', 'Angular', 'Svelte'].map((opt) => (
              <button
                key={opt}
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2 text-left text-gray-300 hover:bg-purple-900/40 transition-colors"
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StyledCheckboxPreview({ props }: PreviewProps) {
  const [checked, setChecked] = useState(true);
  const colorScheme = (props.colorScheme as string) || 'cyan';
  const size = (props.size as string) || 'md';

  const colors: Record<string, string> = {
    cyan: 'bg-cyan-500 border-cyan-500',
    blue: 'bg-blue-500 border-blue-500',
    green: 'bg-green-500 border-green-500',
    purple: 'bg-purple-500 border-purple-500',
    red: 'bg-red-500 border-red-500',
  };

  const sizes: Record<string, { box: string; icon: string }> = {
    sm: { box: 'w-3.5 h-3.5', icon: 'w-2.5 h-2.5' },
    md: { box: 'w-4 h-4', icon: 'w-3 h-3' },
    lg: { box: 'w-5 h-5', icon: 'w-3.5 h-3.5' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <motion.div
        className={`${s.box} rounded border-2 flex items-center justify-center transition-colors ${checked ? colors[colorScheme] : 'border-gray-600 bg-transparent'}`}
        whileTap={{ scale: 0.9 }}
        onClick={() => setChecked(!checked)}
      >
        {checked && <Check className={`${s.icon} text-white`} />}
      </motion.div>
      <span className="text-sm text-gray-300">Accept terms</span>
    </label>
  );
}

export function SelectionGridPreview({ props }: PreviewProps) {
  const [selected, setSelected] = useState(['feature']);
  const multiSelect = props.multiSelect !== false;
  const columns = parseInt(props.columns as string) || 4;

  const options = [
    { id: 'feature', label: 'Feature', emoji: '✨', description: 'New functionality' },
    { id: 'bugfix', label: 'Bug Fix', emoji: '🐛', description: 'Fix issues' },
    { id: 'refactor', label: 'Refactor', emoji: '🔧', description: 'Clean code' },
    { id: 'security', label: 'Security', emoji: '🛡️', description: 'Protect app' },
  ];

  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length > 1) setSelected(selected.filter(s => s !== id));
    } else {
      setSelected(multiSelect ? [...selected, id] : [id]);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs font-semibold text-cyan-300">Scan Type</span>
        {selected.length > 1 && <span className="text-xs text-cyan-500">({selected.length})</span>}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(columns, options.length)}, 1fr)` }}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          return (
            <motion.button
              key={opt.id}
              onClick={() => handleToggle(opt.id)}
              className={`px-2 py-2 rounded-lg border-2 transition-colors ${isSelected ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300' : 'bg-gray-800/40 border-gray-700/40 text-gray-400'}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-[10px] font-semibold">{opt.label}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
