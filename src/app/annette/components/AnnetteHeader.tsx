'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const AnnetteHeader = () => {
  return (
    <motion.div 
      className="mb-12 text-center relative"
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Header Background Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent rounded-3xl"
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.02, 1],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      
      <div className="relative">
        <div className="flex items-center justify-center space-x-4 mb-6">
          {/* Central AI Core */}
          <motion.div
            className="relative"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              rotate: { duration: 30, repeat: Infinity, ease: "linear" },
            }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-slate-500 to-blue-600 p-0.5">
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-cyan-400" />
              </div>
            </div>

            {/* Orbiting Elements */}
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 10 + i * 3,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 1,
                }}
              >
                <motion.div
                  className={`w-2 h-2 rounded-full ${
                    i === 0 ? 'bg-cyan-400' : 
                    i === 1 ? 'bg-slate-400' : 
                    'bg-blue-400'
                  }`}
                  style={{
                    transform: `translateX(${35 + i * 8}px)`,
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
          </motion.div>
          
          <motion.h1 
            className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-slate-400 to-blue-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            ANNETTE
          </motion.h1>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <p className="text-xl text-cyan-300/80 font-mono mb-2">
            ARTIFICIAL NEURAL NETWORK ENHANCED TASK EXECUTOR
          </p>
          <motion.p 
            className="text-gray-400 text-lg max-w-2xl mx-auto"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Next-generation project intelligence with quantum multi-tool orchestration
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AnnetteHeader;