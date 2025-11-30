import React from 'react';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';

interface MdHeadingProps {
  level: number;
  content: string;
  id: string;
  renderInlineContent: (text: string) => React.ReactElement;
}

const BASE_HEADING_CLASSES = "group relative scroll-mt-20 font-semibold tracking-tight text-white flex items-center space-x-3";

const HEADING_STYLES: Record<number, string> = {
  1: `${BASE_HEADING_CLASSES} text-3xl mb-8 mt-0`,
  2: `${BASE_HEADING_CLASSES} text-2xl mb-6 mt-8 pb-2 border-b border-gray-700`,
  3: `${BASE_HEADING_CLASSES} text-xl mb-4 mt-6`,
  4: `${BASE_HEADING_CLASSES} text-lg mb-3 mt-5`,
  5: `${BASE_HEADING_CLASSES} text-base mb-2 mt-4`,
  6: `${BASE_HEADING_CLASSES} text-sm mb-2 mt-3 uppercase tracking-wider`
};

const HASH_ICON_SIZES: Record<number, string> = {
  1: "w-6 h-6",
  2: "w-5 h-5"
};

const getHeadingClasses = (level: number): string => {
  return HEADING_STYLES[level] || HEADING_STYLES[4];
};

const getHashIconSize = (level: number): string => {
  return HASH_ICON_SIZES[level] || "w-4 h-4";
};

const HEADING_ANIMATION = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3 }
};

export default function MdHeading({ level, content, id, renderInlineContent }: MdHeadingProps) {
  const HeadingTag = `h${Math.min(level, 6)}` as keyof React.JSX.IntrinsicElements;

  return (
    <motion.div {...HEADING_ANIMATION}>
      <HeadingTag id={id} className={getHeadingClasses(level)}>
        <Hash className={`${getHashIconSize(level)} text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer`} />
        <span>{renderInlineContent(content)}</span>
      </HeadingTag>
    </motion.div>
  );
}