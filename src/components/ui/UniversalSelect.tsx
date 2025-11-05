'use client';
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import SlimSelect from 'slim-select';
import 'slim-select/styles';
import './UniversalSelect.module.css';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
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
  variant?: 'default' | 'cyber' | 'minimal';
}

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
  variant = 'default'
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);
  const slimSelectRef = useRef<SlimSelect | null>(null);

  const getVariantClasses = () => {
    switch (variant) {
      case 'cyber':
        return {
          container: 'universal-select-cyber',
          label: 'text-cyan-300 font-mono tracking-wider uppercase text-sm',
          helper: 'text-cyan-400/60 font-mono text-sm'
        };
      case 'minimal':
        return {
          container: 'universal-select-minimal',
          label: 'text-slate-300 text-sm',
          helper: 'text-slate-500 text-sm'
        };
      default:
        return {
          container: 'universal-select-default',
          label: 'text-gray-300 text-sm font-medium tracking-wide',
          helper: 'text-gray-400 text-sm'
        };
    }
  };

  const variantClasses = getVariantClasses();

  useEffect(() => {
    if (!selectRef.current || isLoading) return;

    // Initialize SlimSelect
    slimSelectRef.current = new SlimSelect({
      select: selectRef.current,
      settings: {
        showSearch: options.length > 5,
        searchPlaceholder: 'Search...',
        searchText: 'No results found',
        searchingText: 'Searching...',
        placeholderText: placeholder,
        allowDeselect: !required,
        closeOnSelect: true,
      },
      events: {
        afterChange: (newVal) => {
          if (newVal.length > 0) {
            onChange(newVal[0].value);
          } else if (!required) {
            onChange('');
          }
        }
      }
    });

    // Apply variant class to SlimSelect container
    const slimContainer = selectRef.current.parentElement?.querySelector('.ss-main');
    if (slimContainer) {
      slimContainer.classList.add(variantClasses.container);
    }

    return () => {
      slimSelectRef.current?.destroy();
      slimSelectRef.current = null;
    };
  }, [options, placeholder, required, isLoading, variant]);

  // Update value when prop changes
  useEffect(() => {
    if (slimSelectRef.current && value !== undefined) {
      slimSelectRef.current.setSelected(value);
    }
  }, [value]);

  // Handle disabled state
  useEffect(() => {
    if (slimSelectRef.current) {
      if (disabled) {
        slimSelectRef.current.disable();
      } else {
        slimSelectRef.current.enable();
      }
    }
  }, [disabled]);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className={`block mb-3 ${variantClasses.label}`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
          {!required && variant === 'default' && (
            <span className="text-slate-500 ml-1">(Optional)</span>
          )}
        </label>
      )}

      <div className="relative">
        {isLoading ? (
          <div className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700/40 rounded-lg text-gray-400 flex items-center justify-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-4 h-4" />
            </motion.div>
            <span>Loading options...</span>
          </div>
        ) : (
          <select
            ref={selectRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={required}
            className="w-full"
          >
            {placeholder && (
              <option value="" disabled={required}>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {helperText && (
        <div className={`flex items-center space-x-2 mt-2 ${variantClasses.helper}`}>
          <span>{helperText}</span>
        </div>
      )}
    </div>
  );
};
