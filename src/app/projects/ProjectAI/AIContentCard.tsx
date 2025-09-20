import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { AIContentCard as AIContentCardType } from './aiContentConfig';
import { SupportedProvider } from '../../../lib/llm';

interface AIContentCardProps {
  card: AIContentCardType;
  index: number;
  disabled?: boolean;
  selectedProvider: SupportedProvider;
  backgroundTask: boolean;
  onSelectMode: (mode: 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'file-scanner', backgroundTask?: boolean) => void;
}

export default function AIContentCard({ 
  card, 
  index, 
  disabled = false, 
  selectedProvider, 
  backgroundTask, 
  onSelectMode 
}: AIContentCardProps) {
  const Icon = card.icon;
  
  const getProviderName = (provider: SupportedProvider) => {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Claude';
      case 'gemini': return 'Gemini';
      case 'internal': return 'Internal API';
      default: return 'Ollama';
    }
  };

  return (
    <motion.button
      key={card.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={disabled ? {} : { 
        scale: 1.03, 
        y: -4,
        rotateX: 2,
        rotateY: 2
      }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={() => !disabled && onSelectMode(card.id as 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'file-scanner', backgroundTask)}
      disabled={disabled}
      className={`group relative p-6 bg-gradient-to-br ${card.gradient} ${disabled ? '' : card.hoverGradient} border ${card.borderColor} rounded-2xl transition-all duration-500 text-left overflow-hidden ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-2xl hover:shadow-purple-500/10'
      } backdrop-blur-sm`}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      {/* Animated Background Icon with Low Opacity */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center opacity-5 overflow-hidden"
        animate={{
          rotate: disabled ? 0 : [0, 5, -5, 0],
          scale: disabled ? 1 : [1, 1.1, 1]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Icon className="w-32 h-32 text-white" />
      </motion.div>

      {/* Floating Particles Effect */}
      {!disabled && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
              }}
              animate={{
                y: [-10, -20, -10],
                opacity: [0.2, 0.6, 0.2],
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}

      {/* Disabled Overlay with Glassmorphism */}
      {disabled && (
        <motion.div 
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-md rounded-2xl flex items-center justify-center z-20 border border-red-500/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="text-center"
            initial={{ scale: 0.8, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-400 font-semibold">AI Docs Required</p>
            <p className="text-xs text-red-300/70 mt-1">Generate documentation first</p>
          </motion.div>
        </motion.div>
      )}

      {/* Gradient Border Glow Effect */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(45deg, ${card.gradient.replace('from-', '').replace('to-', '').replace('/20', '/40')})`,
            filter: 'blur(8px)',
            zIndex: -1
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Title with Gradient Text */}
        <motion.h3 
          className={`text-xl font-bold mb-4 font-mono bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent ${
            disabled ? '' : 'group-hover:from-white group-hover:to-white'
          } transition-all duration-300`}
          whileHover={disabled ? {} : { x: 2 }}
        >
          {card.title}
        </motion.h3>

        {/* Main Description */}
        <p className={`text-sm text-gray-300 leading-relaxed mb-4 ${
          disabled ? '' : 'group-hover:text-gray-200'
        } transition-colors duration-300`}>
          {card.description}
        </p>

        {/* Bullet Points */}
        {card.bulletPoints && (
          <motion.ul 
            className="space-y-2 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {card.bulletPoints.map((point, i) => (
              <motion.li 
                key={i}
                className={`text-xs text-gray-400 flex items-start ${
                  disabled ? '' : 'group-hover:text-gray-300'
                } transition-colors duration-300`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
              >
                <motion.div
                  className="w-1 h-1 bg-current rounded-full mt-2 mr-2 flex-shrink-0"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                />
                <span className="leading-relaxed">{point}</span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>

      {/* Hover Shimmer Effect */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      )}
    </motion.button>
  );
}