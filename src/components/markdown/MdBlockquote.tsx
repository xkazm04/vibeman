import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

interface MdBlockquoteProps {
  content: string;
  renderInlineContent: (text: string) => React.ReactElement;
}

export default function MdBlockquote({ content, renderInlineContent }: MdBlockquoteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="border-l-4 border-gray-600 bg-gray-800/30 pl-4 py-3 my-4 rounded-r-lg backdrop-blur-sm"
    >
      <div className="flex items-start space-x-3">
        <Quote className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
        <div className="text-gray-300 italic">
          {renderInlineContent(content)}
        </div>
      </div>
    </motion.div>
  );
}