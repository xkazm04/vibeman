import React from 'react';
import { motion } from 'framer-motion';
import { X, ArrowLeft, Trash2 } from 'lucide-react';
import type { ContextGroup } from '../../../../stores/contextStore';
import { getGroupIcon } from './groupDetailUtils';
import ActionButton from './ActionButton';

interface GroupDetailHeaderProps {
  group: ContextGroup;
  titleId: string;
  contextCount: number;
  totalFiles: number;
  uniquePathCount: number;
  onClose: () => void;
  onDelete: () => void;
}

export default function GroupDetailHeader({
  group,
  titleId,
  contextCount,
  totalFiles,
  uniquePathCount,
  onClose,
  onDelete,
}: GroupDetailHeaderProps) {
  const GroupIcon = getGroupIcon(group.name);

  return (
    <div
      className="relative h-20 px-8 flex items-center justify-between border-b border-gray-700/30 z-[110] bg-gray-900/95 backdrop-blur-xl"
      style={{
        background: `linear-gradient(135deg, ${group.color}15 0%, rgba(17, 24, 39, 0.95) 50%, ${group.color}05 100%)`
      }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent" />

      {/* Left Section - Group Info */}
      <div className="flex items-center space-x-4 relative z-[111]">
        <motion.button
          onClick={onClose}
          className="p-3 hover:bg-gray-700/50 rounded-xl transition-all border border-gray-600/30 hover:border-gray-500/50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-6 h-6 text-gray-300" />
        </motion.button>

        <div className="flex items-center space-x-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm border-2"
            style={{
              backgroundColor: `${group.color}20`,
              borderColor: `${group.color}40`
            }}
          >
            <GroupIcon
              className="w-7 h-7"
              style={{ color: group.color }}
            />
          </div>

          <div>
            <h1 id={titleId} className="text-3xl font-bold text-white font-mono">
              {group.name}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-300 font-mono">
              <span>{contextCount} contexts</span>
              <span>•</span>
              <span>{totalFiles} files</span>
              <span>•</span>
              <span>{uniquePathCount} unique paths</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-3 relative z-[111]">
        <ActionButton
          onClick={onDelete}
          icon={Trash2}
          variant="danger"
          aria-label="Delete group"
        />

        <ActionButton
          onClick={onClose}
          icon={X}
          variant="secondary"
          className="w-6 h-6"
          aria-label="Close"
        />
      </div>
    </div>
  );
}
