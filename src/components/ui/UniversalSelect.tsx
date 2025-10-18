'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Loader2 } from 'lucide-react';

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
  const getVariantClasses = () => {
    switch (variant) {
      case 'cyber':
        return {
          container: 'relative group',
          select: `w-full px-4 py-3 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40 
                  border border-cyan-500/30 rounded-lg text-cyan-100 font-mono
                  focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20 
                  transition-all duration-300 appearance-none cursor-pointer
                  hover:border-cyan-400/40 hover:bg-slate-800/60
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-cyan-500/30
                  shadow-lg shadow-cyan-500/10`,
          option: `bg-slate-900 text-cyan-100 font-mono py-2 px-4
                  hover:bg-cyan-950/50 hover:text-cyan-50
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:text-cyan-400/40`,
          icon: 'text-cyan-400 group-hover:text-cyan-300',
          label: 'text-cyan-300 font-mono tracking-wider uppercase text-xs',
          helper: 'text-cyan-400/60 font-mono text-xs'
        };
      case 'minimal':
        return {
          container: 'relative group',
          select: `w-full px-4 py-2.5 bg-transparent border-b-2 border-slate-600/50 
                  text-slate-200 focus:outline-none focus:border-slate-400
                  transition-all appearance-none cursor-pointer
                  hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed`,
          option: `bg-slate-900 text-slate-200 py-2 px-4
                  hover:bg-slate-800 hover:text-white
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-500`,
          icon: 'text-slate-400 group-hover:text-slate-300',
          label: 'text-slate-300 text-sm',
          helper: 'text-slate-500 text-xs'
        };
      default:
        return {
          container: 'relative group',
          select: `w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg 
                  text-white focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 
                  transition-all appearance-none cursor-pointer
                  hover:bg-slate-800/70 hover:border-slate-600/50
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800/50`,
          option: `bg-slate-900 text-white py-2 px-4 font-medium
                  hover:bg-slate-800 hover:text-slate-50
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:text-slate-400`,
          icon: 'text-slate-400 group-hover:text-slate-300',
          label: 'text-slate-300 text-sm font-medium tracking-wide',
          helper: 'text-slate-400 text-xs'
        };
    }
  };

  const variantClasses = getVariantClasses();

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

      <div className={variantClasses.container}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isLoading}
          className={variantClasses.select}
          required={required}
        >
          {placeholder && (
            <option value="" className={variantClasses.option}>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className={variantClasses.option}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom dropdown icon */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className={`w-4 h-4 ${variantClasses.icon}`} />
            </motion.div>
          ) : (
            <motion.div
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className={`w-4 h-4 ${variantClasses.icon} transition-colors`} />
            </motion.div>
          )}
        </div>

        {/* Cyber variant glow effect */}
        {variant === 'cyber' && !disabled && (
          <motion.div
            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.1), transparent)',
              filter: 'blur(8px)'
            }}
          />
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
