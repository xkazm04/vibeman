'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X, Image as ImageIcon } from 'lucide-react';

interface Context {
  id: string;
  name: string;
  groupName?: string;
  groupColor?: string;
  preview?: string | null;
}

interface GroupedContexts {
  groupName: string;
  groupColor: string;
  contexts: Context[];
}

interface ContextSelectorProps {
  projectId: string;
  scanId: string; // Scan type (selectors, photo, etc.)
  scanEventTitle: string; // Event title for this scan type
  onSelect: (contextId: string, contextName: string) => void;
  onClose: () => void;
}

export default function ContextSelector({
  projectId,
  scanId,
  scanEventTitle,
  onSelect,
  onClose,
}: ContextSelectorProps) {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [groupedContexts, setGroupedContexts] = useState<GroupedContexts[]>([]);
  const [ungroupedContexts, setUngroupedContexts] = useState<Context[]>([]);
  const [daysAgoMap, setDaysAgoMap] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadContexts();
  }, [projectId, scanEventTitle]);

  const loadContexts = async () => {
    setIsLoading(true);
    try {
      // Fetch contexts
      const contextResponse = await fetch(`/api/contexts?projectId=${projectId}`);
      if (contextResponse.ok) {
        const contextData = await contextResponse.json();
        const allContexts = (contextData.data.contexts || []) as Context[];
        setContexts(allContexts);

        // Group contexts by their groups
        const grouped: Record<string, Context[]> = {};
        const ungrouped: Context[] = [];

        allContexts.forEach(ctx => {
          if (ctx.groupName) {
            if (!grouped[ctx.groupName]) {
              grouped[ctx.groupName] = [];
            }
            grouped[ctx.groupName].push(ctx);
          } else {
            ungrouped.push(ctx);
          }
        });

        // Convert to array and sort groups by name
        const groupedArray: GroupedContexts[] = Object.entries(grouped)
          .map(([groupName, contexts]) => ({
            groupName,
            groupColor: contexts[0]?.groupColor || '#6B7280',
            contexts: contexts.sort((a, b) => a.name.localeCompare(b.name))
          }))
          .sort((a, b) => a.groupName.localeCompare(b.groupName));

        setGroupedContexts(groupedArray);
        setUngroupedContexts(ungrouped.sort((a, b) => a.name.localeCompare(b.name)));

        // Fetch daysAgo for each context
        await loadDaysAgo(allContexts);
      }
    } catch (error) {
      // Failed to load contexts - silently handle error
    } finally {
      setIsLoading(false);
    }
  };

  const loadDaysAgo = async (contexts: Context[]) => {
    // Initialize all contexts to null (never scanned)
    const daysAgoMapping: Record<string, number | null> = {};
    contexts.forEach(ctx => {
      daysAgoMapping[ctx.id] = null;
    });

    try {
      const response = await fetch(
        `/api/blueprint/events/by-context?projectId=${projectId}&eventTitle=${encodeURIComponent(scanEventTitle)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update mapping with actual days ago from events
          contexts.forEach(ctx => {
            const event = data.events.find((e: any) => e.context_id === ctx.id);
            if (event) {
              const eventDate = new Date(event.created_at);
              const now = new Date();
              const diffMs = now.getTime() - eventDate.getTime();
              const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              daysAgoMapping[ctx.id] = daysAgo; // Can be 0 or positive
            }
            // If no event found, daysAgoMapping[ctx.id] remains null
          });
        }
      }
    } catch (error) {
      // Failed to load daysAgo - silently handle error
      // daysAgoMapping already initialized to null for all contexts
    }

    // Always set the mapping, even if API fails
    setDaysAgoMap(daysAgoMapping);
  };

  const handlePreviewClick = (preview: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewImage(preview);
    setShowPreviewModal(true);
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewImage(null);
  };

  const renderContextCard = (context: Context, index: number) => {
    const daysAgo = daysAgoMap[context.id];
    // Check if daysAgo is a valid number (including 0)
    const hasDaysAgo = typeof daysAgo === 'number';
    const isStale = hasDaysAgo && daysAgo > 7;
    const isRecent = hasDaysAgo && daysAgo <= 7;

    return (
      <motion.button
        key={context.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.02 }}
        onClick={() => onSelect(context.id, context.name)}
        className="relative text-left px-6 py-5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-cyan-500/50 rounded-xl transition-all group"
        data-testid={`context-card-${context.id}`}
      >
        {/* Days ago indicator (inner top right corner) */}
        <div className="absolute top-2 right-2 z-10">
          {hasDaysAgo ? (
            <div className={`px-2 py-1 rounded-lg text-xs font-mono font-bold ${
              isStale
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                : 'bg-green-500/20 text-green-400 border border-green-500/40'
            }`}>
              {daysAgo}d
            </div>
          ) : (
            <div className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-gray-600/20 text-gray-500 border border-gray-600/40">
              NEW
            </div>
          )}
        </div>

        {/* Preview icon (inner bottom left) */}
        {context.preview && (
          <motion.div
            onClick={(e) => handlePreviewClick(context.preview!, e)}
            className="absolute bottom-2 left-2 z-10 p-1.5 bg-gray-700/80 hover:bg-cyan-500/20 rounded-lg border border-gray-600/50 hover:border-cyan-500/50 transition-all cursor-pointer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="View preview"
            data-testid={`context-preview-btn-${context.id}`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-400" />
          </motion.div>
        )}

        <div className="flex flex-col gap-2">
          {/* Context name */}
          <div className="text-white font-semibold font-mono text-lg group-hover:text-cyan-300 transition-colors pr-16">
            {context.name}
          </div>

          {/* Group name */}
          {context.groupName && (
            <div className="flex items-center gap-2">
              <div
                className="text-sm font-mono"
                style={{ color: context.groupColor || '#6B7280' }}
              >
                {context.groupName}
              </div>
            </div>
          )}

          {/* Icon (bottom right) */}
          <div className="absolute bottom-4 right-4">
            <Layers
              className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity"
              style={{
                color: context.groupColor || '#6B7280',
              }}
            />
          </div>
        </div>
      </motion.button>
    );
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
          data-testid="context-selector-backdrop"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-gray-900 via-slate-900 to-blue-900/30 border border-gray-700/50 rounded-2xl p-8 w-full max-w-5xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            data-testid="context-selector-content"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-cyan-400" />
                <h3 className="text-2xl font-semibold text-white font-mono">
                  Select Context
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                data-testid="context-selector-close-btn"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Context Grid */}
            <div className="overflow-y-auto max-h-[calc(80vh-140px)] space-y-8">
              {isLoading ? (
                <div className="text-center py-16 text-gray-500">
                  Loading contexts...
                </div>
              ) : contexts.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  No contexts found for this project.
                </div>
              ) : (
                <>
                  {/* Render grouped contexts */}
                  {groupedContexts.map((group, groupIndex) => (
                    <div key={group.groupName} className="space-y-3">
                      {/* Group header */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: groupIndex * 0.05 }}
                        className="flex items-center gap-2 px-2"
                      >
                        <div
                          className="w-1 h-6 rounded-full"
                          style={{ backgroundColor: group.groupColor }}
                        />
                        <h4
                          className="text-lg font-semibold font-mono"
                          style={{ color: group.groupColor }}
                        >
                          {group.groupName}
                        </h4>
                        <div className="flex-1 h-px bg-gradient-to-r from-gray-600/50 to-transparent" />
                      </motion.div>

                      {/* Group contexts grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.contexts.map((context, index) =>
                          renderContextCard(context, groupIndex * 10 + index)
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Render ungrouped contexts */}
                  {ungroupedContexts.length > 0 && (
                    <div className="space-y-3">
                      {/* Ungrouped header (only show if there are grouped contexts) */}
                      {groupedContexts.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: groupedContexts.length * 0.05 }}
                          className="flex items-center gap-2 px-2"
                        >
                          <div className="w-1 h-6 rounded-full bg-gray-500" />
                          <h4 className="text-lg font-semibold font-mono text-gray-400">
                            Other Contexts
                          </h4>
                          <div className="flex-1 h-px bg-gradient-to-r from-gray-600/50 to-transparent" />
                        </motion.div>
                      )}

                      {/* Ungrouped contexts grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ungroupedContexts.map((context, index) =>
                          renderContextCard(context, (groupedContexts.length * 10) + index)
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4"
            onClick={closePreviewModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closePreviewModal}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-lg border border-gray-600/50 transition-colors"
                data-testid="context-preview-close-btn"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Preview image */}
              <img
                src={previewImage}
                alt="Context preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg border border-gray-700/50 shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
