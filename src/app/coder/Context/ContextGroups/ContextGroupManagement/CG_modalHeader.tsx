'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, X } from 'lucide-react';

interface ModalHeaderProps {
  groupsCount: number;
  onClose: () => void;
}

export default function ModalHeader({ groupsCount, onClose }: ModalHeaderProps) {
  return (
    <div className="relative flex items-center justify-between p-8 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/30 via-slate-900/20 to-gray-800/30 backdrop-blur-sm">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <motion.div
            className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 via-slate-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-cyan-500/30"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              rotate: { duration: 30, repeat: Infinity, ease: "linear" },
            }}
          >
            <Grid3X3 className="w-8 h-8 text-cyan-400" />
          </motion.div>
          <motion.div
            className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-2xl blur-xl opacity-50"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Orbiting Elements */}
          {Array.from({ length: 2 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 8 + i * 2,
                repeat: Infinity,
                ease: "linear",
                delay: i * 1,
              }}
            >
              <motion.div
                className={`w-2 h-2 rounded-full ${
                  i === 0 ? 'bg-cyan-400' : 'bg-blue-400'
                }`}
                style={{
                  transform: `translateX(${30 + i * 6}px)`,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
              />
            </motion.div>
          ))}
        </div>
        <div>
          <motion.h2 
            className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-slate-400 to-blue-400 bg-clip-text text-transparent font-mono mb-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            CONTEXT CLUSTERS
          </motion.h2>
          <motion.p 
            className="text-cyan-300/80 font-mono"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Feature groups
          </motion.p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {groupsCount}/20
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            Groups
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-3 hover:bg-gray-700/50 rounded-xl transition-all duration-300 group"
        >
          <X className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}
