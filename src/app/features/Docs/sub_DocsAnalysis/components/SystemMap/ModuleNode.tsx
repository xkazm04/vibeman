/**
 * ModuleNode Component
 * Individual node in the system map with hover effects and badges
 * Implements progressive disclosure: shows only layer name + connection badge on default
 * Full metadata reveals on hover with smooth transitions
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SystemModule } from './types';
import { getLucideIcon } from './helpers';

interface ModuleNodeProps {
  module: SystemModule;
  position: { x: number; y: number };
  onSelect: (id: string) => void;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  index: number;
  onPositionChange: (id: string, el: HTMLDivElement | null) => void;
  connectionCount: number;
}

// Determine badge color based on count
function getBadgeColor(count: number): string {
  if (count >= 10) return '#ef4444'; // red-500
  if (count >= 5) return '#f59e0b'; // amber-500
  return '#06b6d4'; // cyan-500
}

export default function ModuleNode({
  module,
  position,
  onSelect,
  isHovered,
  isSelected,
  onHover,
  index,
  onPositionChange,
  connectionCount,
}: ModuleNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const IconComponent = getLucideIcon(module.icon);
  const hasCount = module.count !== undefined && module.count > 0;
  const isActive = isHovered || isSelected;
  const hasConnections = connectionCount > 0;

  useEffect(() => {
    onPositionChange(module.id, nodeRef.current);
  }, [module.id, onPositionChange]);

  return (
    <motion.div
      ref={nodeRef}
      className="absolute cursor-pointer group"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isActive ? 1.1 : 1,
        opacity: 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: index * 0.05,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => onHover(module.id)}
      onHoverEnd={() => onHover(null)}
      onClick={() => onSelect(module.id)}
      data-testid={`system-map-node-${module.id}`}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle, ${module.color}40 0%, transparent 70%)`,
          transform: 'scale(2)',
        }}
        animate={{
          opacity: isActive ? 0.8 : 0.3,
          scale: isActive ? 2.5 : 2,
        }}
        transition={{ duration: 0.25 }}
      />

      {/* Main node card */}
      <motion.div
        className={`relative flex flex-col items-center justify-center w-24 h-20 rounded-2xl backdrop-blur-md border ${
          isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-cyan-500' : ''
        }`}
        style={{
          background: `linear-gradient(135deg, ${module.color}25 0%, ${module.color}08 100%)`,
          borderColor: isActive ? `${module.color}80` : `${module.color}40`,
          boxShadow: isActive
            ? `0 0 30px ${module.color}50, inset 0 0 20px ${module.color}15`
            : `0 0 15px ${module.color}20`,
        }}
        animate={{
          borderColor: isActive ? `${module.color}80` : `${module.color}40`,
        }}
        transition={{ duration: 0.2 }}
      >
        <IconComponent
          className="w-6 h-6 mb-1"
          style={{ color: isActive ? module.color : `${module.color}cc` }}
        />
        <span
          className="text-[10px] font-medium text-center leading-tight px-2"
          style={{ color: isActive ? module.color : `${module.color}cc` }}
        >
          {module.name}
        </span>

        {/* Connection Count Badge - Always visible but subtle, more prominent on hover */}
        {hasConnections && (
          <motion.div
            className="absolute -top-2 -left-2 min-w-[20px] h-[20px]
              rounded-full bg-violet-500/80 text-white text-[9px] font-medium
              flex items-center justify-center px-1
              border border-violet-400/50 shadow-sm
              opacity-60 group-hover:opacity-100
              scale-90 group-hover:scale-100
              transition-all duration-200"
            initial={{ scale: 0 }}
            animate={{ scale: 0.9 }}
            data-testid={`system-map-connections-${module.id}`}
            title={`${connectionCount} connection${connectionCount > 1 ? 's' : ''}`}
          >
            {connectionCount}
          </motion.div>
        )}

        {/* Context Count Badge - Progressive disclosure: hidden by default, shows on hover */}
        {hasCount && (
          <motion.div
            className="absolute -top-2 -right-2 min-w-[22px] h-[22px]
              rounded-full text-white text-[10px] font-bold
              flex items-center justify-center px-1 shadow-lg
              border-2 border-gray-900
              opacity-0 group-hover:opacity-100
              scale-95 group-hover:scale-100
              transition-all duration-200"
            style={{ backgroundColor: getBadgeColor(module.count!) }}
            initial={{ scale: 0 }}
            animate={{ scale: isActive ? 1 : 0.95 }}
            data-testid={`system-map-badge-${module.id}`}
          >
            {module.count! > 99 ? '99+' : module.count}
          </motion.div>
        )}

        {/* Pulse animation for nodes with counts - only on hover for reduced cognitive load */}
        {hasCount && isActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              border: `2px solid ${module.color}`,
            }}
            animate={{
              opacity: [0.5, 0, 0.5],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
