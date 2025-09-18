import React from 'react';
import { motion } from 'framer-motion';

interface MdListProps {
  items: string[];
  renderInlineContent: (text: string) => React.ReactElement;
}

export default function MdList({ items, renderInlineContent }: MdListProps) {
  return (
    <motion.ul
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2 text-gray-300 my-4"
    >
      {items.map((item, itemIndex) => (
        <motion.li
          key={itemIndex}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: itemIndex * 0.05 }}
          className="flex items-start space-x-3"
        >
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></span>
          <span>{renderInlineContent(item)}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
} 