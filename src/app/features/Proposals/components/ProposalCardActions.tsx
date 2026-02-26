'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, Code } from 'lucide-react';

interface ProposalCardActionsProps {
  isMain?: boolean;
  onAccept?: () => void;
  onAcceptWithCode?: () => void;
  onDecline?: () => void;
  isProcessing?: boolean;
}

const PARTICLE_OFFSETS = [
  { left: '20%', top: '30%', x: -12, y: -14 },
  { left: '40%', top: '45%', x: 0, y: -16 },
  { left: '60%', top: '60%', x: 12, y: -14 },
];

const ActionButton = React.memo(({
  onClick,
  disabled,
  icon: Icon,
  color
}: {
  onClick?: () => void;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  color: 'red' | 'purple' | 'green';
}) => {
  const [burstKey, setBurstKey] = useState(0);

  const handleHover = useCallback(() => {
    setBurstKey((k) => k + 1);
  }, []);

  const colorClasses = {
    red: {
      bg: 'from-red-500/20 to-orange-500/20 hover:from-red-500/30 hover:to-orange-500/30',
      border: 'border-red-500/30',
      gradient: '#ef4444',
      icon: 'text-red-400',
      particle: 'bg-red-400/40'
    },
    purple: {
      bg: 'from-purple-500/20 to-violet-500/20 hover:from-purple-500/30 hover:to-violet-500/30',
      border: 'border-purple-500/30',
      gradient: '#8b5cf6',
      icon: 'text-purple-400',
      particle: 'bg-purple-400/40'
    },
    green: {
      bg: 'from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30',
      border: 'border-green-500/30',
      gradient: '#10b981',
      icon: 'text-green-400',
      particle: 'bg-green-400/40'
    }
  };

  const classes = colorClasses[color];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={handleHover}
      className={`relative group p-4 bg-gradient-to-r ${classes.bg} rounded-2xl border ${classes.border} transition-all duration-300 disabled:opacity-50`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Neural Glow Effect */}
      <motion.div
        className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(45deg, ${classes.gradient}, transparent, ${classes.gradient})`,
          filter: 'blur(8px)',
        }}
      />

      <div className="relative flex items-center justify-center">
        {disabled ? (
          <Loader2 className={`w-8 h-8 ${classes.icon} animate-spin`} />
        ) : (
          <Icon className={`w-8 h-8 ${classes.icon}`} />
        )}
      </div>

      {/* Hover-triggered particle burst */}
      {PARTICLE_OFFSETS.map((p, i) => (
        <motion.div
          key={`${burstKey}-${i}`}
          className={`absolute w-1 h-1 ${classes.particle} rounded-full pointer-events-none`}
          style={{ left: p.left, top: p.top }}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], x: p.x, y: p.y }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
        />
      ))}
    </motion.button>
  );
});

ActionButton.displayName = 'ActionButton';

export const ProposalCardActions = React.memo(({ 
  isMain = false,
  onAccept, 
  onAcceptWithCode, 
  onDecline, 
  isProcessing = false 
}: ProposalCardActionsProps) => {
  if (!isMain) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex justify-between items-center pt-4"
    >
      {/* Decline Button */}
      <ActionButton 
        onClick={onDecline} 
        disabled={isProcessing} 
        icon={X} 
        color="red" 
      />

      {/* Middle buttons container */}
      <div className="flex space-x-4">
        {/* Accept with Code Button */}
        <ActionButton 
          onClick={onAcceptWithCode} 
          disabled={isProcessing} 
          icon={Code} 
          color="purple" 
        />

        {/* Accept Button */}
        <ActionButton 
          onClick={onAccept} 
          disabled={isProcessing} 
          icon={Check} 
          color="green" 
        />
      </div>
    </motion.div>
  );
});

ProposalCardActions.displayName = 'ProposalCardActions';


