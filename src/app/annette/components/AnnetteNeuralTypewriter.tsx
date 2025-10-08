'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface NeuralTypewriterProps {
  message: string;
  speed?: number;
}

const AnnetteNeuralTypewriter = ({ message, speed = 25 }: NeuralTypewriterProps) => {
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
    <div className="text-white leading-relaxed font-mono">
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="text-cyan-400 ml-1"
        >
          ▋
        </motion.span>
      )}
    </div>
  );
};

export default AnnetteNeuralTypewriter;