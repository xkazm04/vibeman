import React from 'react';
import { motion } from 'framer-motion';
import { DbDocumentation } from '@/app/db';
import { LucideIcon } from 'lucide-react';

interface DocsSectionCardProps {
  doc: DbDocumentation;
  icon: LucideIcon;
  colorClass: string;
  onClick: () => void;
  index: number;
}

export default function DocsSectionCard({
  doc,
  icon: Icon,
  colorClass,
  onClick,
  index
}: DocsSectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div className={`relative overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br ${colorClass} p-6 transition-all hover:scale-105 hover:shadow-xl`}>
        {/* Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Icon */}
        <div className="relative mb-4">
          <Icon className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h3 className="relative text-xl font-bold text-white mb-2">
          {doc.title}
        </h3>

        {/* Metadata */}
        <div className="relative text-sm text-white/70">
          <div>Updated {new Date(doc.updated_at).toLocaleDateString()}</div>
          {doc.auto_generated === 1 && (
            <div className="mt-1 inline-block px-2 py-0.5 rounded bg-white/20 text-xs">
              Auto-generated
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
