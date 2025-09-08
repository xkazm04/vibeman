'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TypewriterMessageProps {
  message: string;
  speed?: number;
}

export default function TypewriterMessage({ message, speed = 50 }: TypewriterMessageProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    
    let currentIndex = 0;
    const timer = setInterval(() => {
      if (currentIndex < message.length) {
        setDisplayedText(message.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [message, speed]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5 shadow-2xl text-center"
    >
      <div className="text-gray-200 text-base leading-relaxed">
        {displayedText}
        {!isComplete && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-cyan-400 ml-1"
          >
            |
          </motion.span>
        )}
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 pointer-events-none" />
      
      {/* Message indicator arrow pointing to button */}
      <div className="absolute -bottom-2 right-8 w-4 h-4 bg-gray-900/95 border-r border-b border-gray-700/50 rotate-45" />
    </motion.div>
  );
}