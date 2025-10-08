'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, Zap, AlertCircle, CheckCircle } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

const CompactSystemLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: 'Neural network initialized successfully'
    },
    {
      id: '2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Context clusters synchronized'
    }
  ]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Simulate real-time logs
  useEffect(() => {
    const interval = setInterval(() => {
      const messages = [
        'Processing neural pathways...',
        'Context synchronization complete',
        'Memory optimization in progress',
        'Neural cluster analysis finished',
        'System performance optimal',
        'Data streams synchronized'
      ];
      
      const types: LogEntry['type'][] = ['info', 'success', 'warning'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: randomType,
        message: randomMessage
      };

      setLogs(prev => [newLog, ...prev.slice(0, 9)]); // Keep only 10 logs
    }, 8000 + Math.random() * 12000); // Random interval 8-20 seconds

    return () => clearInterval(interval);
  }, []);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      default: return Activity;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-cyan-400';
    }
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-gray-900/95 via-indigo-900/20 to-purple-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden shadow-xl h-20"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Neural Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-indigo-500/5 to-purple-500/5 rounded-2xl" />
      
      {/* Animated Grid Pattern */}
      <motion.div
        className="absolute inset-0 opacity-5 rounded-2xl"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '12px 12px'
        }}
        animate={{
          backgroundPosition: ['0px 0px', '12px 12px'],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Compact Header */}
      <motion.div
        className="relative p-3 bg-gradient-to-r from-gray-800/30 via-indigo-900/20 to-gray-800/30 cursor-pointer h-full flex items-center"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.4)' }}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
            </motion.div>
            <div>
              <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent font-mono">
                NEURAL LOGS
              </h3>
            </div>
          </div>
          
          {/* Live Log Preview */}
          <div className="flex-1 mx-4 min-w-0">
            {logs.length > 0 && (
              <motion.div
                className="flex items-center space-x-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <motion.div
                  className="w-2 h-2 bg-green-400 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="text-xs text-gray-300 font-mono truncate">
                  {logs[0].message}
                </p>
              </motion.div>
            )}
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-green-400 font-mono">ONLINE</span>
          </div>
        </div>
      </motion.div>

      {/* Compact Log Display */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative p-3"
          >
            {logs.slice(0, 2).map((log, index) => {
              const IconComponent = getLogIcon(log.type);
              return (
                <motion.div
                  key={log.id}
                  className="flex items-center space-x-3 py-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                  >
                    <IconComponent className={`w-3 h-3 ${getLogColor(log.type)}`} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 font-mono truncate">
                      {log.message}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {log.timestamp.split(':').slice(0, 2).join(':')}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Log Display */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative max-h-64 overflow-y-auto"
          >
            <div className="p-3 space-y-2">
              {logs.map((log, index) => {
                const IconComponent = getLogIcon(log.type);
                return (
                  <motion.div
                    key={log.id}
                    className="flex items-start space-x-3 p-2 rounded-lg bg-gray-800/30 backdrop-blur-sm border border-gray-700/20"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                    >
                      <IconComponent className={`w-4 h-4 ${getLogColor(log.type)} mt-0.5`} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 font-mono leading-relaxed">
                        {log.message}
                      </p>
                      <span className="text-xs text-gray-500 font-mono">
                        {log.timestamp}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Particles */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
          style={{
            left: `${20 + i * 30}%`,
            top: `${20 + i * 20}%`,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.7,
          }}
        />
      ))}
    </motion.div>
  );
};

export default CompactSystemLogs;