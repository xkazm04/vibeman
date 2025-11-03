import React from 'react';

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low' | 'critical';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const getStyles = () => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600/30 text-red-300';
      case 'high':
        return 'bg-red-500/20 text-red-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'low':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <span className={`text-sm px-2 py-1 rounded-full font-mono ${getStyles()}`}>
      {priority}
    </span>
  );
};
