import React from 'react';
import { motion } from 'framer-motion';

interface MdParagraphProps {
  content: string;
  renderInlineContent: (text: string) => React.ReactElement;
}

// Check if content contains interactive elements
const hasInteractiveContent = (content: string): boolean => {
  return content.includes('{{') && content.includes('}}');
};

// Animation props for paragraph
const PARAGRAPH_ANIMATION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

export default function MdParagraph({ content, renderInlineContent }: MdParagraphProps) {
  // Use div instead of p if it contains interactive content to avoid nesting issues
  const Component = hasInteractiveContent(content) ? motion.div : motion.p;

  return (
    <Component
      {...PARAGRAPH_ANIMATION}
      className="text-gray-300 leading-relaxed mb-4"
    >
      {renderInlineContent(content)}
    </Component>
  );
}