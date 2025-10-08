import React from 'react';
import { motion } from 'framer-motion';
import { FileCheck, Brain, Sparkles } from 'lucide-react';
import { codebaseScanCards, ideaGenerationCards } from './aiContentConfig';
import AIContentCard from './AIContentCard';
import { SupportedProvider } from '../../../lib/llm';

interface AIScanSelectionProps {
  aiDocsExist: boolean;
  selectedProvider: SupportedProvider;
  backgroundTask: boolean;
  onSelectMode: (mode: 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'file-scanner', backgroundTask?: boolean) => void;
}

export default function AIScanSelection({
  aiDocsExist,
  selectedProvider,
  backgroundTask,
  onSelectMode
}: AIScanSelectionProps) {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
      {/* Animated Header with Particles */}
      <motion.div 
        className="text-center mb-12 relative"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
              style={{
                left: `${10 + i * 10}%`,
                top: `${20 + (i % 3) * 20}%`,
              }}
              animate={{
                y: [-5, -15, -5],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <motion.div
          className="relative z-10"
          animate={{ 
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-blue-400 to-red-400 bg-clip-text text-transparent font-mono">
            AI Project Assistant
          </h2>
          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-blue-500 via-blue-500 to-red-500 rounded-full mx-auto mb-4"
            animate={{ scaleX: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
        
        <motion.p 
          className="text-gray-400 max-w-2xl mx-auto leading-relaxed text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Choose how you'd like AI to help analyze and improve your project.
          Each option provides different insights and actionable recommendations.
        </motion.p>
      </motion.div>

      {/* Codebase Scan Section */}
      <motion.div 
        className="mb-12"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <motion.div 
          className="flex items-center mb-6 group"
          whileHover={{ x: 4 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="p-2 bg-blue-500/20 rounded-lg mr-3 border border-blue-500/30"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <FileCheck className="w-6 h-6 text-blue-400" />
          </motion.div>
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
              Codebase Analysis
            </h3>
            <motion.div
              className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-transparent rounded-full mt-1"
              animate={{ scaleX: [1, 1.5, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
          <motion.div
            className="ml-auto"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-5 h-5 text-blue-400/60" />
          </motion.div>
        </motion.div>
        
        <motion.p 
          className="text-sm text-gray-400 mb-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Analyze your project structure, code quality, and generate comprehensive documentation.
          Get insights into your codebase architecture and optimization opportunities.
        </motion.p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {codebaseScanCards.map((card, index) => (
            <AIContentCard
              key={card.id}
              card={card}
              index={index}
              selectedProvider={selectedProvider}
              backgroundTask={backgroundTask}
              onSelectMode={onSelectMode}
            />
          ))}
        </div>
      </motion.div>

      {/* Idea Generation Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <motion.div 
          className="flex items-center mb-6 group"
          whileHover={{ x: 4 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="p-2 bg-blue-500/20 rounded-lg mr-3 border border-blue-500/30"
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ duration: 0.2 }}
          >
            <Brain className="w-6 h-6 text-blue-400" />
          </motion.div>
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
              Strategic Planning
            </h3>
            <motion.div
              className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-transparent rounded-full mt-1"
              animate={{ scaleX: [1, 1.5, 1] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
          </div>
          {!aiDocsExist && (
            <motion.div 
              className="ml-4 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-xs text-red-400 font-semibold"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Requires AI Docs
            </motion.div>
          )}
          <motion.div
            className="ml-auto"
            animate={{ rotate: [0, -360] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-5 h-5 text-blue-400/60" />
          </motion.div>
        </motion.div>
        
        <motion.p 
          className="text-sm text-gray-400 mb-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          Generate strategic goals and implementation tasks based on your project analysis.
          {!aiDocsExist && (
            <motion.span 
              className="text-red-400 ml-2 font-medium"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Generate AI Docs first to unlock these features.
            </motion.span>
          )}
        </motion.p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {ideaGenerationCards.map((card, index) => (
            <AIContentCard
              key={card.id}
              card={card}
              index={index}
              disabled={!aiDocsExist}
              selectedProvider={selectedProvider}
              backgroundTask={backgroundTask}
              onSelectMode={onSelectMode}
            />
          ))}
        </div>
      </motion.div>

      {/* Bottom Spacer for Better Scrolling */}
      <div className="h-8" />
    </div>
  );
}