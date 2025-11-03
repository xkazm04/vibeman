'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
  colorGradient: string;
}

interface BreakdownCardProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  items: BreakdownItem[];
}

export function BreakdownCard({ title, icon: Icon, iconColor, items }: BreakdownCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 capitalize">{item.label}</span>
              <span className="text-white font-medium">{item.count}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`h-full bg-gradient-to-r ${item.colorGradient} rounded-full`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
