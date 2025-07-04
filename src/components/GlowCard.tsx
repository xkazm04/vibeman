import React from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  glowColor?: 'cyan' | 'purple' | 'green' | 'pink';
}

export const GlowCard: React.FC<GlowCardProps> = ({ 
  children, 
  className = '', 
  glow = false, 
  glowColor = 'cyan' 
}) => {
  const glowColors = {
    cyan: 'shadow-cyan-500/50',
    purple: 'shadow-purple-500/50',
    green: 'shadow-green-500/50',
    pink: 'shadow-pink-500/50'
  };

  return (
    <div className={`
      bg-gray-900/70 backdrop-blur-xl border border-gray-700/50 rounded-lg
      ${glow ? `shadow-lg ${glowColors[glowColor]}` : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}; 