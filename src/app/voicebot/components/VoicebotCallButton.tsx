'use client';

import { motion } from 'framer-motion';
import { Phone, PhoneOff, Loader2, AlertCircle } from 'lucide-react';

type SessionState = 'idle' | 'connecting' | 'active' | 'processing' | 'error';

interface VoicebotCallButtonProps {
  sessionState: SessionState;
  isListening: boolean;
  audioLevel: number;
  onStartSession: () => void;
  onEndSession: () => void;
}

export default function VoicebotCallButton({
  sessionState,
  isListening,
  audioLevel,
  onStartSession,
  onEndSession
}: VoicebotCallButtonProps) {
  
  const getStateConfig = () => {
    switch (sessionState) {
      case 'connecting':
        return {
          icon: Loader2,
          color: 'from-yellow-500 to-orange-500',
          borderColor: 'border-yellow-500/50',
          bgColor: 'bg-yellow-600/10',
          text: 'Connecting...',
          description: 'Establishing connection to voice server'
        };
      case 'active':
        return {
          icon: PhoneOff,
          color: 'from-green-500 to-emerald-500',
          borderColor: 'border-green-500/50',
          bgColor: 'bg-green-600/10',
          text: isListening ? 'Listening...' : 'Processing...',
          description: 'Call in progress - Speak naturally'
        };
      case 'processing':
        return {
          icon: Loader2,
          color: 'from-blue-500 to-cyan-500',
          borderColor: 'border-blue-500/50',
          bgColor: 'bg-blue-600/10',
          text: 'Processing...',
          description: 'Analyzing your message'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'from-red-500 to-rose-500',
          borderColor: 'border-red-500/50',
          bgColor: 'bg-red-600/10',
          text: 'Error',
          description: 'Connection failed - Click to retry'
        };
      default:
        return {
          icon: Phone,
          color: 'from-cyan-500 to-blue-500',
          borderColor: 'border-cyan-500/50',
          bgColor: 'bg-cyan-600/10',
          text: 'Start Call',
          description: 'Click to begin voice session'
        };
    }
  };

  const config = getStateConfig();
  const IconComponent = config.icon;
  const isActive = sessionState === 'active' || sessionState === 'processing';

  return (
    <div className="h-full bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-2xl border-2 border-cyan-500/20 overflow-hidden shadow-xl shadow-slate-500/10 p-4">
      <div className="flex items-center gap-4 h-full">
        {/* Call Button - Compact */}
        <motion.div
          className="relative flex-shrink-0"
          animate={{
            scale: isListening ? [1, 1.02, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: isListening ? Infinity : 0,
          }}
        >
          <motion.button
            onClick={isActive ? onEndSession : (sessionState === 'error' ? onStartSession : onStartSession)}
            disabled={sessionState === 'connecting'}
            className={`
              relative w-20 h-20 rounded-full border-4 
              ${config.borderColor} ${config.bgColor}
              transition-all duration-300 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              overflow-hidden
            `}
            whileHover={sessionState !== 'connecting' ? { scale: 1.05 } : {}}
            whileTap={sessionState !== 'connecting' ? { scale: 0.95 } : {}}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-20`} />
            
            {isActive && (
              <motion.div
                className={`absolute inset-0 rounded-full border-4 ${config.borderColor}`}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            )}

            {isListening && audioLevel > 0 && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-green-400/60"
                animate={{
                  scale: 1 + audioLevel * 0.5,
                  opacity: audioLevel,
                }}
                transition={{ duration: 0.1 }}
              />
            )}

            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <motion.div
                animate={sessionState === 'connecting' || sessionState === 'processing' ? {
                  rotate: 360,
                } : {}}
                transition={{
                  duration: 2,
                  repeat: (sessionState === 'connecting' || sessionState === 'processing') ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <IconComponent className={`w-10 h-10 bg-gradient-to-br ${config.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
              </motion.div>
            </div>
          </motion.button>
        </motion.div>

        {/* State Info - Horizontal */}
        <div className="flex-1 min-w-0">
          <motion.h3
            key={config.text}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-lg font-bold mb-1 bg-gradient-to-r ${config.color} bg-clip-text text-transparent font-mono truncate`}
          >
            {config.text}
          </motion.h3>
          <motion.p
            key={config.description}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-gray-400 font-mono truncate"
          >
            {config.description}
          </motion.p>
        </div>

        {/* Audio Visualizer - Inline */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex-shrink-0"
          >
            <div className="flex items-center space-x-0.5 h-12">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-green-500 to-cyan-400 rounded-full"
                  animate={{
                    height: `${Math.max(8, (Math.random() * audioLevel * 40) + 10)}%`,
                    opacity: audioLevel > 0.01 ? [0.5, 1, 0.5] : 0.3,
                  }}
                  transition={{
                    duration: 0.15,
                    ease: "easeOut",
                    opacity: { duration: 0.5, repeat: Infinity }
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Session Status - Compact */}
        <div className="flex-shrink-0 flex items-center gap-4 text-sm font-mono border-l border-cyan-500/20 pl-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              sessionState === 'idle' ? 'bg-gray-400' :
              sessionState === 'connecting' ? 'bg-yellow-400' :
              sessionState === 'active' || sessionState === 'processing' ? 'bg-green-400' :
              'bg-red-400'
            }`} />
            <span className="text-white uppercase">{sessionState}</span>
          </div>

          {isActive && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Level:</span>
              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 to-cyan-400"
                  animate={{
                    width: `${audioLevel * 100}%`,
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-white">{Math.round(audioLevel * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
