/**
 * LayerLabel Component
 * Label for each layer row in the system map
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ModuleLayer, LayerConfig } from './types';

interface LayerLabelProps {
  layer: ModuleLayer;
  config: LayerConfig;
}

export default function LayerLabel({ layer, config }: LayerLabelProps) {
  return (
    <motion.div
      className="absolute left-3 flex items-center gap-2"
      style={{ top: `${config.rowY}%`, transform: 'translateY(-50%)' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}80` }}
      />
      <span
        className="text-xs font-mono tracking-wider uppercase"
        style={{ color: `${config.color}aa` }}
      >
        {config.label}
      </span>
    </motion.div>
  );
}
