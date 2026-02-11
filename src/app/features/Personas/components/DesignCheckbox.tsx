'use client';

import { Check } from 'lucide-react';

interface DesignCheckboxProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  color?: 'primary' | 'blue' | 'purple';
}

export function DesignCheckbox({ checked, onChange, disabled = false, color = 'primary' }: DesignCheckboxProps) {
  const checkedColor =
    color === 'blue' ? 'bg-blue-500 border border-blue-500' :
    color === 'purple' ? 'bg-purple-500 border border-purple-500' :
    'bg-primary border border-primary';

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        checked
          ? checkedColor
          : `bg-secondary/40 border ${
              disabled ? 'border-primary/10' : 'border-primary/20 hover:border-primary/40'
            }`
      }`}
    >
      {checked && (
        <Check className="w-3 h-3 text-white transition-transform duration-150 scale-100" strokeWidth={3} />
      )}
    </button>
  );
}
