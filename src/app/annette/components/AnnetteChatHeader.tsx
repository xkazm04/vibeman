'use client';

import { Project } from '@/types';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface AnnetteChatHeaderProps {
  selectedProject?: Project;
  isProcessing?: boolean;
  isListening?: boolean;
  audioLevels: number[];
  isAudioActive: boolean;
}

const AnnetteChatHeader = ({ 
  selectedProject, 
  isProcessing, 
  isListening, 
  audioLevels, 
  isAudioActive 
}: AnnetteChatHeaderProps) => {
  return (
    <motion.div 
      className="relative p-6 bg-gradient-to-r from-slate-600/30 via-blue-600/20 to-cyan-600/30 border-b border-cyan-500/30"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Equalizer Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className="flex items-end space-x-1 h-8">
          {audioLevels.map((level, i) => (
            <motion.div
              key={i}
              className="w-1 bg-gradient-to-t from-slate-500 to-cyan-400 rounded-full"
              animate={{
                height: `${Math.max(4, level)}%`,
                opacity: level > 0 ? 0.8 : 0.3,
              }}
              transition={{
                duration: 0.1,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Animated AI Avatar */}
          <motion.div
            className="relative"
            animate={{ 
              rotate: isProcessing ? [0, 360] : 0,
              scale: isListening ? [1, 1.1, 1] : 1
            }}
            transition={{ 
              rotate: { duration: 2, repeat: isProcessing ? Infinity : 0, ease: "linear" },
              scale: { duration: 1, repeat: isListening ? Infinity : 0 }
            }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-500 via-blue-500 to-cyan-500 p-0.5">
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            
            {/* Pulse Ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
              animate={{
                scale: isAudioActive ? [1, 1.3, 1] : 1,
                opacity: isAudioActive ? [0.5, 0, 0.5] : 0,
              }}
              transition={{
                duration: 2,
                repeat: isAudioActive ? Infinity : 0,
              }}
            />
          </motion.div>
          
          <div>
            <motion.h3 
              className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              ANNETTE AI
            </motion.h3>
            <motion.p 
              className="text-sm text-cyan-300/80 font-mono"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {selectedProject ? `[ANALYZING] ${selectedProject.name}` : '[STANDBY] Select project'}
            </motion.p>
          </div>
        </div>
        
        {/* Status Indicators */}
        <motion.div
          className="flex items-center space-x-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {/* Audio Visualizer */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 h-4 bg-gradient-to-t from-slate-500 to-cyan-400 rounded-full"
                animate={{
                  scaleY: isAudioActive ? [0.3, 1, 0.3] : 0.3,
                  opacity: isAudioActive ? [0.5, 1, 0.5] : 0.5,
                }}
                transition={{
                  duration: 0.5,
                  repeat: isAudioActive ? Infinity : 0,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
          
          {/* Status Light */}
          <motion.div
            className={`w-3 h-3 rounded-full ${
              isProcessing ? 'bg-yellow-400' : 
              isListening ? 'bg-red-400' : 
              'bg-green-400'
            }`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
          
          <span className="text-xs text-cyan-300/60 font-mono uppercase tracking-wider">
            {isProcessing ? 'PROC' : isListening ? 'LISTEN' : 'READY'}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AnnetteChatHeader;