'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';

interface ContextDescriptionProps {
  description: string;
  groupColor: string;
}

export default function ContextDescription({
  description,
  groupColor,
}: ContextDescriptionProps) {
  if (!description) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30"
      >
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No description available</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-6 rounded-2xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30"
    >
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="w-5 h-5" style={{ color: groupColor }} />
        <h5 className="text-lg font-semibold text-gray-300 font-mono">Description</h5>
      </div>
      <div className="markdown-content">
        <MarkdownViewer content={description} />
      </div>
    </motion.div>
  );
}
