import React from 'react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, className = 'py-12' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center text-gray-500 ${className}`}>
      {Icon && <Icon className="w-12 h-12 mb-3 opacity-50" />}
      <p className="text-sm">{title}</p>
      {description && <p className="text-xs mt-1 max-w-md">{description}</p>}
    </div>
  );
}
