'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw } from 'lucide-react';
import { BacklogProposal } from '../../../types';
import BacklogItem from './BacklogItem';

interface BacklogSectionProps {
  agentType: 'developer' | 'artist';
  items: BacklogProposal[];
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  newItemIds: Set<string>;
  onAccept: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  onOpenForm: () => void;
  onRefresh?: () => void;
}

export default function BacklogSection({
  agentType,
  items,
  icon: Icon,
  title,
  newItemIds,
  onAccept,
  onReject,
  onOpenForm,
  onRefresh
}: BacklogSectionProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <span className="text-sm text-gray-400">({items.length})</span>
        </div>
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefresh}
              className="p-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 rounded-md text-gray-400 hover:text-gray-300 transition-all"
              title="Refresh backlog"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenForm}
            className="p-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 rounded-md text-gray-400 hover:text-gray-300 transition-all"
            title="Add custom item"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No {agentType} tasks yet
          </div>
        ) : (
          items.map((item) => (
            <BacklogItem
              key={item.id}
              proposal={item}
              onAccept={onAccept}
              onReject={onReject}
              isNew={newItemIds.has(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
} 