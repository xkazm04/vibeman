'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Proposal } from '../types';
import { ProposalCardHeader } from './ProposalCardHeader';
import { ProposalCardContent } from './ProposalCardContent';
import { ProposalCardActions } from './ProposalCardActions';

export interface ProposalCardProps {
  proposal: Proposal;
  isMain?: boolean;
  index?: number;
  onAccept?: () => void;
  onAcceptWithCode?: () => void;
  onDecline?: () => void;
  isProcessing?: boolean;
}

export const ProposalCard = React.memo(({ 
  proposal, 
  isMain = false, 
  index = 0, 
  onAccept, 
  onAcceptWithCode, 
  onDecline, 
  isProcessing = false 
}: ProposalCardProps) => {
  // Animation properties based on card state
  const scale = isMain ? 1 : 0.75;
  const opacity = isMain ? 1 : 0.5;
  const blur = isMain ? 0 : 12;

  // Calculate position with wider spacing for better visual separation
  // Main: center (50%), 1st inactive: 35% of viewport left, 2nd inactive: 70% of viewport left
  const getXPosition = () => {
    if (isMain) return '-50%';
    // Use percentage of viewport width for truly responsive spacing
    const baseOffset = 35; // 35% of viewport width
    const totalOffset = baseOffset + (index * 35);
    return `calc(-50% - ${totalOffset}vw)`;
  };

  // Responsive visibility classes for next proposals
  const getVisibilityClass = () => {
    if (isMain) return '';
    // First next proposal: visible from xl, second: visible from 2xl
    if (index === 0) return 'hidden xl:block';
    return 'hidden 2xl:block';
  };

  return (
    <motion.div
      className={`fixed top-1/2 left-1/2 ${isMain ? 'z-20' : 'z-10'} ${getVisibilityClass()}`}
      style={{
        y: '-50%'
      }}
      initial={{ 
        scale: isMain ? 0.9 : 0.75,
        opacity: 0,
        x: getXPosition(),
        filter: `blur(${blur}px)`
      }}
      animate={{ 
        scale,
        opacity,
        filter: `blur(${blur}px)`,
        x: getXPosition()
      }}
      exit={{ 
        scale: 0.7, 
        opacity: 0,
        x: '150%',
        filter: 'blur(20px)',
        transition: {
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1]
        }
      }}
      transition={{ 
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }}
      layout
    >
      <div className={`relative bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 backdrop-blur-xl border border-gray-700/40 rounded-3xl shadow-2xl overflow-hidden ${isMain ? 'w-[600px]' : 'w-[500px]'} max-w-[90vw]`}>
        {/* Neural Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5 rounded-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-3xl" />
        
        {/* Animated Grid Pattern */}
        <motion.div
          className="absolute inset-0 opacity-5 rounded-3xl"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '20px 20px'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Floating Neural Particles */}
        {isMain && Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            style={{
              left: `${10 + i * 10}%`,
              top: `${15 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, Math.random() * 10 - 5, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.2, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}

        <div className="relative p-8">
          {/* Header - Only show on main proposal */}
          <ProposalCardHeader isMain={isMain} />

          {/* Proposal Content */}
          <ProposalCardContent 
            title={proposal.title}
            rationale={proposal.rationale}
            isMain={isMain}
          />

          {/* Action Buttons - Only show on main proposal */}
          <ProposalCardActions
            isMain={isMain}
            onAccept={onAccept}
            onAcceptWithCode={onAcceptWithCode}
            onDecline={onDecline}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </motion.div>
  );
});

ProposalCard.displayName = 'ProposalCard';

