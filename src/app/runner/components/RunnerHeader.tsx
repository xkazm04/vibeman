'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const RunnerHeader = React.memo(() => {
  return (
    <motion.div className="relative p-6 bg-gradient-to-r from-gray-800/30 via-slate-900/20 to-gray-800/30 border-b border-gray-700/30 backdrop-blur-sm">
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <motion.div
            className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-cyan-500/30"
            animate={{
              boxShadow: [
                '0 0 0 rgba(6, 182, 212, 0)', 
                '0 0 20px rgba(6, 182, 212, 0.4)', 
                '0 0 0 rgba(6, 182, 212, 0)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Activity className="w-5 h-5 text-cyan-400" />
          </motion.div>
          
          <div>
            <motion.h3 
              className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-slate-400 to-blue-400 bg-clip-text text-transparent font-mono"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              PROJECT RUNNER
            </motion.h3>
            <motion.div 
              className="flex items-center space-x-2 text-sm text-gray-400 font-mono"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div 
                className="w-2 h-2 bg-cyan-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span>neural orchestration</span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

RunnerHeader.displayName = 'RunnerHeader';

export default RunnerHeader;