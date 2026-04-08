import React from 'react';
import { motion } from 'framer-motion';
import { FolderTree, FileText, Calendar } from 'lucide-react';
import type { ContextGroup } from '../../../../stores/contextStore';
import StatCard from './StatCard';

interface GroupDetailStatsProps {
  group: ContextGroup;
  contextCount: number;
  totalFiles: number;
}

export default function GroupDetailStats({
  group,
  contextCount,
  totalFiles,
}: GroupDetailStatsProps) {
  const daysOld = Math.floor(
    (new Date().getTime() - group.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      <StatCard
        icon={FolderTree}
        value={contextCount}
        label="Contexts"
        iconColor={group.color}
        iconBgColor={`${group.color}20`}
      />

      <StatCard
        icon={FileText}
        value={totalFiles}
        label="Total Files"
        iconColor="#60A5FA"
        iconBgColor="rgba(96, 165, 250, 0.2)"
      />

      <StatCard
        icon={Calendar}
        value={`${daysOld}d`}
        label="Days Old"
        iconColor="#60A5FA"
        iconBgColor="rgba(96, 165, 250, 0.2)"
      />
    </motion.div>
  );
}
