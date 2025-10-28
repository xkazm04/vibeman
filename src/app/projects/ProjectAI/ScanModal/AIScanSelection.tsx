import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { codebaseScanCards } from './aiContentConfig';
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
      {/* Bottom Spacer for Better Scrolling */}
      <div className="h-8" />
    </div>
  );
}