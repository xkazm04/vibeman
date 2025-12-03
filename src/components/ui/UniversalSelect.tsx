'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check, Loader2, X } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { getFocusRingStyles } from '@/lib/ui/focusRing';
import { durations } from '@/lib/design-tokens';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  color?: string; // Optional color indicator
  icon?: React.ReactNode; // Optional icon
}

interface UniversalSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  helperText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  variant?: 'default' | 'cyber' | 'minimal' | 'compact';
  searchable?: boolean; // Enable search filter (auto-enabled for 5+ options)
  searchPlaceholder?: string;
  emptyMessage?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Variant styling configurations
const VARIANT_STYLES = {
  default: {
    trigger: 'bg-gray-800/60 border-gray-700/40 hover:bg-gray-700/50 hover:border-gray-600/50',
    triggerOpen: 'border-purple-500/40 ring-2 ring-purple-500/20',
    dropdown: 'bg-gray-900 border-gray-700/50',
    option: 'hover:bg-purple-900/40',
    optionSelected: 'bg-purple-900/60',
    search: 'bg-gray-800 border-gray-700/50 focus:border-purple-500/50',
    text: 'text-gray-200',
    textMuted: 'text-gray-400',
    labelClass: 'text-gray-300 text-sm font-medium tracking-wide',
    helperClass: 'text-gray-400 text-sm',
  },
  cyber: {
    trigger: 'bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40 border-cyan-500/30 hover:border-cyan-400/50',
    triggerOpen: 'border-cyan-400/50 ring-2 ring-cyan-500/20',
    dropdown: 'bg-slate-900 border-cyan-500/30',
    option: 'hover:bg-cyan-950/50',
    optionSelected: 'bg-cyan-950/70',
    search: 'bg-slate-800/60 border-cyan-500/30 focus:border-cyan-400/50',
    text: 'text-cyan-100',
    textMuted: 'text-cyan-400/60',
    labelClass: 'text-cyan-100 font-mono tracking-wider uppercase text-sm',
    helperClass: 'text-cyan-400/60 font-mono text-sm',
  },
  minimal: {
    trigger: 'bg-transparent border-0 border-b-2 border-slate-600/50 rounded-none hover:border-slate-500',
    triggerOpen: 'border-slate-400',
    dropdown: 'bg-slate-900 border-slate-600/30',
    option: 'hover:bg-slate-800',
    optionSelected: 'bg-slate-700',
    search: 'bg-slate-800 border-slate-600/50 focus:border-slate-400',
    text: 'text-slate-200',
    textMuted: 'text-slate-400',
    labelClass: 'text-slate-300 text-sm',
    helperClass: 'text-slate-500 text-sm',
  },
  compact: {
    trigger: 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-700/50',
    triggerOpen: 'border-cyan-500/50 ring-1 ring-cyan-500/20',
    dropdown: 'bg-gray-800 border-gray-700/50',
    option: 'hover:bg-gray-700/50',
    optionSelected: 'bg-gray-700/30',
    search: 'bg-gray-700/50 border-gray-600/50 focus:border-cyan-500/50',
    text: 'text-gray-200',
    textMuted: 'text-gray-500',
    labelClass: 'text-gray-400 text-xs uppercase tracking-wider',
    helperClass: 'text-gray-500 text-xs',
  },
};

const SIZE_STYLES = {
  sm: {
    trigger: 'px-2 py-1.5 text-xs min-h-[32px]',
    dropdown: 'text-xs',
    option: 'px-2 py-1.5',
    search: 'px-2 py-1.5 text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    trigger: 'px-3 py-2.5 text-sm min-h-[44px]',
    dropdown: 'text-sm',
    option: 'px-3 py-2',
    search: 'px-3 py-2 text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    trigger: 'px-4 py-3 text-base min-h-[52px]',
    dropdown: 'text-base',
    option: 'px-4 py-3',
    search: 'px-4 py-2.5 text-base',
    icon: 'w-5 h-5',
  },
};

export const UniversalSelect: React.FC<UniversalSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  label,
  helperText,
  isLoading = false,
  disabled = false,
  required = false,
  className = '',
  variant = 'default',
  searchable,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { theme } = useThemeStore();
  const focusRingClasses = getFocusRingStyles(theme);
  const styles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];

  // Auto-enable search for 5+ options unless explicitly disabled
  const showSearch = searchable ?? options.length >= 5;

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Get selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, showSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggle = () => {
    if (!disabled && !isLoading) {
      setIsOpen(!isOpen);
      if (isOpen) {
        setSearchQuery('');
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!required) {
      onChange('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Label */}
      {label && (
        <label className={`block mb-2 ${styles.labelClass}`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
          {!required && variant === 'default' && (
            <span className="text-slate-500 ml-1">(Optional)</span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        data-testid="universal-select-trigger"
        className={`
          w-full flex items-center justify-between gap-2 rounded-lg border transition-all
          ${sizeStyles.trigger}
          ${styles.trigger}
          ${isOpen ? styles.triggerOpen : ''}
          ${focusRingClasses}
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isLoading ? (
          <div className={`flex items-center gap-2 ${styles.textMuted}`}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className={sizeStyles.icon} />
            </motion.div>
            <span>Loading...</span>
          </div>
        ) : selectedOption ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedOption.color && (
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedOption.color }}
              />
            )}
            {selectedOption.icon && (
              <span className="flex-shrink-0">{selectedOption.icon}</span>
            )}
            <span className={`truncate ${styles.text}`}>{selectedOption.label}</span>
          </div>
        ) : (
          <span className={`truncate ${styles.textMuted}`}>{placeholder}</span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Clear button */}
          {selectedOption && !required && !disabled && !isLoading && (
            <motion.span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className={`p-0.5 rounded hover:bg-gray-700/50 ${styles.textMuted} hover:text-white transition-colors cursor-pointer`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-3 h-3" />
            </motion.span>
          )}
          <ChevronDown 
            className={`${sizeStyles.icon} transition-transform duration-200 ${styles.textMuted} ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => {
                setIsOpen(false);
                setSearchQuery('');
              }} 
            />
            
            {/* Dropdown Panel */}
            <motion.div
              className={`
                absolute top-full left-0 right-0 mt-1 z-50
                rounded-lg border shadow-xl overflow-hidden
                ${styles.dropdown}
                ${sizeStyles.dropdown}
              `}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: durations.fast, ease: 'easeOut' }}
            >
              {/* Search Input */}
              {showSearch && (
                <div className="p-2 border-b border-gray-700/30">
                  <div className="relative">
                    <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${sizeStyles.icon} ${styles.textMuted}`} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      className={`
                        w-full pl-8 pr-3 rounded-md border transition-all
                        ${sizeStyles.search}
                        ${styles.search}
                        ${styles.text}
                        placeholder:${styles.textMuted}
                        outline-none
                      `}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${styles.textMuted} hover:text-white`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Options List */}
              <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                {filteredOptions.length === 0 ? (
                  <div className={`px-3 py-4 text-center ${styles.textMuted}`}>
                    {emptyMessage}
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = option.value === value;
                    const isDisabled = option.disabled;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => !isDisabled && handleSelect(option.value)}
                        disabled={isDisabled}
                        className={`
                          w-full flex items-center justify-between gap-2 transition-colors
                          ${sizeStyles.option}
                          ${isSelected ? styles.optionSelected : styles.option}
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          ${styles.text}
                        `}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {option.color && (
                            <div 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: option.color }}
                            />
                          )}
                          {option.icon && (
                            <span className="flex-shrink-0">{option.icon}</span>
                          )}
                          <span className="truncate">{option.label}</span>
                        </div>
                        {isSelected && (
                          <Check className={`${sizeStyles.icon} flex-shrink-0 text-cyan-400`} />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      {helperText && (
        <p className={`mt-1.5 ${styles.helperClass}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default UniversalSelect;
