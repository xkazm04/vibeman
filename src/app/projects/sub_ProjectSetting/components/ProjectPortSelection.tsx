import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ProjectType } from '@/types';

interface ProjectPortSelectionProps {
  projectType: ProjectType;
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
        // Failed to fetch used ports - silently continue
      } finally {
        setLoading(false);
      }
    };

    if (projectType !== 'generic') {
      fetchUsedPorts();
    }
  }, [projectType]);

  // Get port range based on project type
  const getPortRange = () => {
    switch (projectType) {
      case 'nextjs':
      case 'react':
      case 'express':
      case 'rails':
      case 'combined':
        return Array.from({ length: 11 }, (_, i) => 3000 + i); // 3000-3010
      case 'fastapi':
      case 'django':
        return Array.from({ length: 11 }, (_, i) => 8000 + i); // 8000-8010
      case 'generic':
      default:
        return [];
    }
  };

  const ports = getPortRange();

  // If project type is 'generic', don't render the port selection
  if (projectType === 'generic') {
    return null;
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400">
        Port *
        <span className="text-gray-500 ml-1">
          ({projectType === 'nextjs' || projectType === 'react' ? '3000-3010' : '8000-8010'})
        </span>
      </label>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
          <span className="text-xs">Checking ports...</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
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
                  relative px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all
                  ${isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
                    : isUsed
                      ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed line-through'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                  }
                `}
                whileHover={!isUsed ? { scale: 1.03 } : {}}
                whileTap={!isUsed ? { scale: 0.97 } : {}}
              >
                {port}
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4 text-[10px] text-gray-500 pt-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-800/40 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-800/50 rounded line-through"></div>
          <span>In use</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-cyan-500/20 ring-1 ring-cyan-500/40 rounded"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}