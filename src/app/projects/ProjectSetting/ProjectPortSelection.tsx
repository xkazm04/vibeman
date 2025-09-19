import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ProjectPortSelectionProps {
  projectType: 'nextjs' | 'fastapi' | 'other';
  selectedPort: number;
  onPortSelect: (port: number) => void;
}

export default function ProjectPortSelection({ 
  projectType, 
  selectedPort, 
  onPortSelect 
}: ProjectPortSelectionProps) {
  const [usedPorts, setUsedPorts] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch used ports from the database
  useEffect(() => {
    const fetchUsedPorts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/projects/ports');
        const data = await response.json();
        if (data.usedPorts) {
          setUsedPorts(data.usedPorts);
        }
      } catch (error) {
        console.error('Failed to fetch used ports:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectType !== 'other') {
      fetchUsedPorts();
    }
  }, [projectType]);

  // Get port range based on project type
  const getPortRange = () => {
    switch (projectType) {
      case 'nextjs':
        return Array.from({ length: 11 }, (_, i) => 3000 + i); // 3000-3010
      case 'fastapi':
        return Array.from({ length: 11 }, (_, i) => 8000 + i); // 8000-8010
      default:
        return [];
    }
  };

  const ports = getPortRange();

  // If project type is 'other', don't render the port selection
  if (projectType === 'other') {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Port Selection
        <span className="text-xs text-gray-500 ml-2">
          ({projectType === 'nextjs' ? '3000-3010' : '8000-8010'})
        </span>
      </label>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
          <span className="ml-2 text-sm text-gray-400">Loading ports...</span>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {ports.map((port) => {
            const isUsed = usedPorts.includes(port);
            const isSelected = selectedPort === port;
            
            return (
              <motion.button
                key={port}
                type="button"
                onClick={() => !isUsed && onPortSelect(port)}
                disabled={isUsed}
                className={`
                  relative px-3 py-2 rounded-md text-sm font-mono transition-all duration-200
                  ${isSelected 
                    ? 'bg-cyan-500/30 text-cyan-300 border-2 border-cyan-400' 
                    : isUsed 
                      ? 'bg-gray-700/50 text-gray-500 border border-gray-600 cursor-not-allowed' 
                      : 'bg-gray-700/30 text-gray-300 border border-gray-600 hover:bg-gray-600/50 hover:border-gray-500'
                  }
                `}
                whileHover={!isUsed ? { scale: 1.05 } : {}}
                whileTap={!isUsed ? { scale: 0.95 } : {}}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.2,
                  delay: (port % 10) * 0.02 // Stagger animation based on port number
                }}
              >
                {port}
                {isUsed && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="w-[50%] h-0.5 bg-red-400/30 rotate-45 absolute"></div>
                    <div className="w-[50%] h-0.5 bg-red-400/30 -rotate-45 absolute"></div>
                  </motion.div>
                )}
                {isSelected && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      )}
      
      {selectedPort && !usedPorts.includes(selectedPort) && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-3 py-2"
        >
          Selected port: {selectedPort}
        </motion.div>
      )}
      
      <div className="flex items-center space-x-4 text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-700/30 border border-gray-600 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-700/50 border border-gray-600 rounded relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-red-400/60 rotate-45"></div>
              <div className="w-full h-0.5 bg-red-400/60 -rotate-45 absolute"></div>
            </div>
          </div>
          <span>In use</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-cyan-500/30 border-2 border-cyan-400 rounded"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}