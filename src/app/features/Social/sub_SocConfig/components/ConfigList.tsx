'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { SocialChannelConfigResponse, SocialChannelType } from '../lib/types';
import { ChannelIcon } from './ChannelIcon';

interface ConfigListProps {
  configs: SocialChannelConfigResponse[];
  selectedConfigId: string | null;
  selectedChannel: SocialChannelType | null;
  onSelectConfig: (config: SocialChannelConfigResponse) => void;
  onAddNew: () => void;
  onDelete: (id: string) => void;
}

export function ConfigList({
  configs,
  selectedConfigId,
  selectedChannel,
  onSelectConfig,
  onAddNew,
  onDelete,
}: ConfigListProps) {
  // Filter configs by selected channel
  const filteredConfigs = selectedChannel
    ? configs.filter((c) => c.channelType === selectedChannel)
    : configs;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'expired':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'failed':
        return 'Failed';
      case 'expired':
        return 'Expired';
      default:
        return 'Not tested';
    }
  };

  return (
    <div className="w-72 bg-gray-900/40 rounded-xl border border-gray-700/40 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/40">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">
            {selectedChannel ? `${selectedChannel} Configs` : 'All Configurations'}
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddNew}
            className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            title="Add new configuration"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          {filteredConfigs.length} configuration{filteredConfigs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Config List */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredConfigs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <Settings className="w-8 h-8 text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">
                {selectedChannel
                  ? `No ${selectedChannel} configurations yet`
                  : 'No configurations yet'}
              </p>
              <button
                onClick={onAddNew}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
              >
                Add your first one
              </button>
            </motion.div>
          ) : (
            filteredConfigs.map((config) => (
              <motion.div
                key={config.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => onSelectConfig(config)}
                className={`
                  group relative p-3 mb-2 rounded-lg cursor-pointer
                  transition-all duration-150
                  ${selectedConfigId === config.id
                    ? 'bg-cyan-500/20 border border-cyan-500/40'
                    : 'bg-gray-800/40 border border-transparent hover:bg-gray-700/60 hover:border-gray-600/40'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <ChannelIcon
                    channel={config.channelType}
                    isActive={config.isEnabled}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200 truncate">
                        {config.name}
                      </span>
                      {!config.isEnabled && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium bg-gray-700 text-gray-400 rounded">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {getStatusIcon(config.connectionStatus)}
                      <span className="text-[10px] text-gray-500">
                        {getStatusText(config.connectionStatus)}
                      </span>
                    </div>
                    {config.itemsFetchedCount > 0 && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        {config.itemsFetchedCount} items fetched
                      </p>
                    )}
                  </div>
                </div>

                {/* Delete button (hidden by default) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(config.id);
                  }}
                  className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100
                    bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all"
                  title="Delete configuration"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ConfigList;
