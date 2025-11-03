'use client';

import { ReactNode } from 'react';

interface WizardHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * WizardHeader - Consistent header for wizard steps
 *
 * Features:
 * - Title and optional description
 * - Optional icon
 * - Optional action buttons (right-aligned)
 * - Center or left-aligned variants
 */
export default function WizardHeader({
  title,
  description,
  icon,
  actions,
  className = ''
}: WizardHeaderProps) {
  const hasActions = !!actions;
  const centered = !hasActions;

  return (
    <div className={`${centered ? 'text-center' : 'flex items-center justify-between'} ${className}`}>
      <div className={centered ? '' : 'flex-1'}>
        {icon && (
          <div className={`${centered ? 'mx-auto mb-4' : 'mb-2'} w-fit`}>
            {icon}
          </div>
        )}
        <h3 className="text-xl font-light text-white mb-2">{title}</h3>
        {description && (
          <p className="text-gray-400 text-sm">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
