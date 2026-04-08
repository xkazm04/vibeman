import React from 'react';
import { motion } from 'framer-motion';

interface FormSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  description?: string;
}

export default function FormSection({ title, icon: Icon, children, description }: FormSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/40 border border-gray-700/40 rounded-xl overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-700/40 bg-gray-800/60">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <div className="p-4 space-y-4">
        {children}
      </div>
    </motion.div>
  );
}
