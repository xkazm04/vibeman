import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

/**
 * Loading Animation Component with 1-minute timer for AI documentation generation
 * Shows progress bar and estimated time remaining
 */
export default function LoadingAnimation() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 60000; // 1 minute in milliseconds
    const interval = 100; // Update every 100ms
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center py-10 rounded-xl max-w-md">
        <div className="relative mb-6">
          <FileText className="w-16 h-16 mx-auto text-blue-400 animate-pulse" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">
          Generating Project Documentation
        </h3>
        <p className="text-gray-400 mb-4 leading-relaxed">
          AI is conducting a comprehensive analysis of your project structure, code quality, and architecture...
        </p>
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <motion.div
            className="bg-blue-400 h-2 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {Math.round(progress)}% complete • {Math.round((100 - progress) * 0.6)} seconds remaining
        </p>
      </div>
    </div>
  );
}