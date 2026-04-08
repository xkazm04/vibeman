import React from 'react';

const SIZE_CLASSES = {
  sm: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-2xl',
} as const;

interface AvatarBadgeProps {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function AvatarBadge({ name, size = 'sm', className = '' }: AvatarBadgeProps) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      <span className="font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
