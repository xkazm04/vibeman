import React from 'react';
import { motion } from 'framer-motion';

interface MdParagraphProps {
  content: string;
  renderInlineContent: (text: string) => React.ReactElement;
}

export default function MdParagraph({ content, renderInlineContent }: MdParagraphProps) {
  // Check if content contains interactive elements
  const hasInteractiveContent = content.includes('{{') && content.includes('}}');
  
  // Use div instead of p if it contains interactive content to avoid nesting issues
  const Component = hasInteractiveContent ? motion.div : motion.p;
  
  return (
    <Component
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-gray-300 leading-relaxed mb-4"
    >
      {renderInlineContent(content)}
    </Component>
  );
}