'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  Power,
  PowerOff,
  Trash2,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Tag
} from 'lucide-react';
import type { RegisteredPlugin, PluginStatus } from '../lib/plugins/types';

interface PluginManagerProps {
  onPluginChange?: () => void;
}

const statusColors: Record<PluginStatus, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2 },
  inactive: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: PowerOff },
  error: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle },
  loading: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: RefreshCw }
};

export default function PluginManager({ onPluginChange }: PluginManagerProps) {
  const [plugins, setPlugins] = useState<RegisteredPlugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch plugins
  const fetchPlugins = async () => {
    try {
      const res = await fetch('/api/tech-debt/plugins');
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins || []);
      }
    } catch (error) {
      console.error('Error fetching plugins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  // Toggle plugin activation
  const togglePlugin = async (pluginId: string, currentStatus: PluginStatus) => {
    setActionLoading(pluginId);
    try {
      const action = currentStatus === 'active' ? 'deactivate' : 'activate';
      const res = await fetch('/api/tech-debt/plugins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId, action })
      });

      if (res.ok) {
        await fetchPlugins();
        onPluginChange?.();
      }
    } catch (error) {
      console.error('Error toggling plugin:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Unregister plugin
  const unregisterPlugin = async (pluginId: string) => {
    if (!confirm('Are you sure you want to unregister this plugin?')) return;

    setActionLoading(pluginId);
    try {
      const res = await fetch('/api/tech-debt/plugins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId })
      });

      if (res.ok) {
        await fetchPlugins();
        onPluginChange?.();
      }
    } catch (error) {
      console.error('Error unregistering plugin:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const StatusIcon = ({ status }: { status: PluginStatus }) => {
    const config = statusColors[status];
    const Icon = config.icon;
    return (
      <div className={`p-1.5 rounded-lg ${config.bg}`}>
        <Icon
          className={`w-4 h-4 ${config.text} ${status === 'loading' ? 'animate-spin' : ''}`}
        />
      </div>
    );
  };

  return (
    <div
      className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden"
      data-testid="plugin-manager"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
            <Puzzle className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Plugin Manager</h3>
            <p className="text-xs text-gray-400">
              {plugins.length} plugin{plugins.length !== 1 ? 's' : ''} registered
            </p>
          </div>
        </div>
        <button
          onClick={fetchPlugins}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          title="Refresh plugins"
          data-testid="refresh-plugins-btn"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Plugin List */}
      <div className="divide-y divide-gray-700/30">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading plugins...</p>
          </div>
        ) : plugins.length === 0 ? (
          <div className="p-8 text-center">
            <Puzzle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No plugins installed</p>
            <p className="text-sm text-gray-500 mt-1">
              Add plugins to extend tech debt scanning capabilities
            </p>
          </div>
        ) : (
          plugins.map((plugin) => (
            <motion.div
              key={plugin.metadata.id}
              layout
              className="bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
              data-testid={`plugin-item-${plugin.metadata.id}`}
            >
              {/* Plugin Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() =>
                  setExpandedPlugin(
                    expandedPlugin === plugin.metadata.id ? null : plugin.metadata.id
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={plugin.status} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {plugin.metadata.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          v{plugin.metadata.version}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-1">
                        {plugin.metadata.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Category badge */}
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700/50 text-gray-300">
                      {plugin.metadata.category}
                    </span>

                    {/* Expand/collapse */}
                    {expandedPlugin === plugin.metadata.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedPlugin === plugin.metadata.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Author:</span>
                          <span className="ml-2 text-gray-300">
                            {plugin.metadata.author}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-500">Loaded:</span>
                          <span className="ml-1 text-gray-300">
                            {new Date(plugin.loadedAt).toLocaleString()}
                          </span>
                        </div>
                        {plugin.metadata.homepage && (
                          <a
                            href={plugin.metadata.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Homepage
                          </a>
                        )}
                        {plugin.metadata.repository && (
                          <a
                            href={plugin.metadata.repository}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Repository
                          </a>
                        )}
                      </div>

                      {/* Tags */}
                      {plugin.metadata.tags && plugin.metadata.tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tag className="w-3 h-3 text-gray-500" />
                          {plugin.metadata.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs rounded-full bg-gray-700/50 text-gray-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Error message */}
                      {plugin.status === 'error' && plugin.lastError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-red-400">Error</p>
                              <p className="text-sm text-red-300/80 mt-1">
                                {plugin.lastError}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-700/30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlugin(plugin.metadata.id, plugin.status);
                          }}
                          disabled={
                            actionLoading === plugin.metadata.id ||
                            plugin.status === 'loading'
                          }
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                            ${
                              plugin.status === 'active'
                                ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                          data-testid={`toggle-plugin-${plugin.metadata.id}`}
                        >
                          {actionLoading === plugin.metadata.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : plugin.status === 'active' ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                          {plugin.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            unregisterPlugin(plugin.metadata.id);
                          }}
                          disabled={actionLoading === plugin.metadata.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                            bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all
                            disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid={`unregister-plugin-${plugin.metadata.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Unregister
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
