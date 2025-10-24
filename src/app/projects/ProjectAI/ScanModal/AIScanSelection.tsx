import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { codebaseScanCards, ideaGenerationCards } from './aiContentConfig';
import AIContentCard from './AIContentCard';
import { SupportedProvider } from '../../../../lib/llm';

interface AIScanSelectionProps {
  aiDocsExist: boolean;
  selectedProvider: SupportedProvider;
  backgroundTask: boolean;
  onSelectMode: (mode: 'docs' | 'code' | 'file-scanner', backgroundTask?: boolean) => void;
}

export default function AIScanSelection({
  aiDocsExist,
  selectedProvider,
  backgroundTask,
  onSelectMode
}: AIScanSelectionProps) {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
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