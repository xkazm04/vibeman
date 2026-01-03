'use client';

import React from 'react';
import { UniversalSelect, type SelectOption } from './UniversalSelect';

export interface FilterSelectProps {
  /** Label displayed above the select */
  label: string;
  /** Array of selected values (supports single selection, stored as array for consistency) */
  value: string[];
  /** Callback when selection changes */
  onChange: (values: string[]) => void;
  /** Available options */
  options: SelectOption[];
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Visual variant for the select */
  variant?: 'default' | 'cyber' | 'minimal' | 'compact';
  /** Size of the select */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className for the container */
  className?: string;
  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * FilterSelect - A labeled select component for filter UIs
 *
 * Wraps UniversalSelect with consistent label styling and converts
 * array-based value/onChange to single-string based operations.
 * Useful for filter panels where values need to be stored as arrays
 * but selection is single-choice.
 */
export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  variant = 'default',
  size = 'md',
  className = '',
  'data-testid': testId,
}) => (
  <div className={className} data-testid={testId}>
    <label className="block text-sm font-medium text-gray-400 mb-2">
      {label}
    </label>
    <UniversalSelect
      value={value.length > 0 ? value[0] : ''}
      onChange={(selectedValue) => {
        onChange(selectedValue ? [selectedValue] : []);
      }}
      options={options}
      variant={variant}
      size={size}
      placeholder={placeholder}
      data-testid={testId ? `${testId}-select` : undefined}
    />
  </div>
);

export default FilterSelect;
