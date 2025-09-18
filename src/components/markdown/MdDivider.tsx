import React from 'react';
import { motion } from 'framer-motion';

export default function MdDivider() {
  return (
    <motion.hr
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.5 }}
      className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"
    />
  );
}