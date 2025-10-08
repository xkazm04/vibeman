'use client';

import { motion } from 'framer-motion';

interface AnnetteViewToggleProps {
  viewMode: 'chat' | 'logs';
  onViewModeChange: (mode: 'chat' | 'logs') => void;
}

const AnnetteViewToggle = ({ viewMode, onViewModeChange }: AnnetteViewToggleProps) => {
  return (
    <motion.div 
      className="flex justify-center mb-8"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.7, duration: 0.6 }}
    >
      <motion.div 
        className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-1.5 border-2 border-cyan-500/30"
        whileHover={{ scale: 1.02 }}
      >
        {/* Animated Background Selector */}
        <motion.div
          className="absolute inset-1.5 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-slate-500/20"
          animate={{
            x: viewMode === 'chat' ? 0 : '100%',
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ width: '50%' }}
        />
        
        <div className="relative flex">
          <motion.button
            onClick={() => onViewModeChange('chat')}
            className={`px-8 py-3 rounded-2xl transition-all duration-300 font-mono uppercase tracking-wider text-sm ${
              viewMode === 'chat' 
                ? 'text-cyan-100 font-bold' 
                : 'text-gray-400 hover:text-cyan-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Neural Interface
          </motion.button>
          <motion.button
            onClick={() => onViewModeChange('logs')}
            className={`px-8 py-3 rounded-2xl transition-all duration-300 font-mono uppercase tracking-wider text-sm ${
              viewMode === 'logs' 
                ? 'text-cyan-100 font-bold' 
                : 'text-gray-400 hover:text-cyan-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            System Logs
          </motion.button>
        </div>
        
        {/* Status Indicators */}
        <div className="absolute -top-2 -right-2 flex space-x-1">
          <motion.div
            className="w-2 h-2 bg-green-400 rounded-full"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="w-2 h-2 bg-cyan-400 rounded-full"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnnetteViewToggle;