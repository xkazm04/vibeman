import React from 'react';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';

interface MdHeadingProps {
  level: number;
  content: string;
  id: string;
  renderInlineContent: (text: string) => React.ReactElement;
}

export default function MdHeading({ level, content, id, renderInlineContent }: MdHeadingProps) {
  const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
  
  const getHeadingClasses = (level: number) => {
    const baseClasses = "group relative scroll-mt-20 font-semibold tracking-tight text-white flex items-center space-x-3";
    
    switch (level) {
      case 1:
        return `${baseClasses} text-3xl mb-8 mt-0`;
      case 2:
        return `${baseClasses} text-2xl mb-6 mt-8 pb-2 border-b border-gray-700`;
      case 3:
        return `${baseClasses} text-xl mb-4 mt-6`;
      case 4:
        return `${baseClasses} text-lg mb-3 mt-5`;
      case 5:
        return `${baseClasses} text-base mb-2 mt-4`;
      case 6:
        return `${baseClasses} text-sm mb-2 mt-3 uppercase tracking-wider`;
      default:
        return `${baseClasses} text-lg mb-3 mt-5`;
    }
  };

  const getHashIconSize = (level: number) => {
    switch (level) {
      case 1: return "w-6 h-6";
      case 2: return "w-5 h-5";
      default: return "w-4 h-4";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <HeadingTag id={id} className={getHeadingClasses(level)}>
        <Hash className={`${getHashIconSize(level)} text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer`} />
        <span>{renderInlineContent(content)}</span>
      </HeadingTag>
    </motion.div>
  );
}