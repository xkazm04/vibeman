'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Folder } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextSelector, { Context, ContextGroup } from '@/components/ContextSelector';
import PreviewDisplay from '@/app/features/Context/sub_ContextPreview/components/PreviewDisplay';

interface ScreenCatalogProps {
  projectId: string | null;
}

export default function ScreenCatalog({ projectId }: ScreenCatalogProps) {
  const { activeProject } = useActiveProjectStore();
  const [contexts, setContexts] = useState<Context[]>([]);
  const [contextGroups, setContextGroups] = useState<ContextGroup[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Selected context object
  const selectedContext = selectedContextId
    ? contexts.find(c => c.id === selectedContextId)
    : undefined;

  // Fetch contexts and groups when project changes
  useEffect(() => {
    const fetchContexts = async () => {
      if (!projectId) {
        setContexts([]);
        setContextGroups([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/contexts?projectId=${projectId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch contexts');
        }

        const data = await response.json();

        if (data.success) {
          setContexts(data.data.contexts || []);
          setContextGroups(data.data.groups || []);
        }
      } catch (error) {
        console.error('[ScreenCatalog] Error fetching contexts:', error);
        setContexts([]);
        setContextGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContexts();
  }, [projectId]);

  // Handle context selection
  const handleSelectContext = (contextId: string | null) => {
    setSelectedContextId(contextId);
    setImageError(false);
  };

  // Get preview path from context
  const getPreviewPath = (): string => {
    if (!selectedContext) return '';

    // Use the preview field from the context if available
    // The preview field is relative to the public folder
    return selectedContext.preview || '';
  };

  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900/30 rounded-lg border border-gray-700/30">
        <div className="text-center p-6">
          <Folder className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
          <p className="text-sm text-gray-500">No project selected</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900/30 rounded-lg border border-gray-700/30">
        <div className="text-center p-6">
          <div className="w-8 h-8 mx-auto mb-3 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading contexts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900/30 rounded-lg border border-gray-700/30 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-700/30 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Screen Catalog</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {contexts.length > 0 ? (
          <>
            {/* Context Selector */}
            <ContextSelector
              contexts={contexts}
              contextGroups={contextGroups}
              selectedContext={selectedContext}
              onSelectContext={handleSelectContext}
              showFullProjectButton={false}
            />

            {/* Preview Display */}
            {selectedContext && getPreviewPath() && (
              <motion.div
                key={selectedContext.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <PreviewDisplay
                  previewPath={getPreviewPath()}
                  contextName={selectedContext.name}
                  imageError={imageError}
                  onError={() => setImageError(true)}
                  height="h-64"
                  className="min-h-[16rem]"
                />
              </motion.div>
            )}

            {/* Show message if context selected but no preview */}
            {selectedContext && !getPreviewPath() && (
              <div className="flex items-center justify-center py-12 bg-gray-800/20 rounded-lg border border-gray-700/20 border-dashed">
                <div className="text-center p-4">
                  <ImageIcon className="w-10 h-10 text-gray-600 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-gray-500">No preview available</p>
                  <p className="text-xs text-gray-600 mt-1">
                    This context doesn't have a screenshot yet
                  </p>
                </div>
              </div>
            )}

            {/* Empty state when no context selected */}
            {!selectedContext && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-gray-500">Select a context to view preview</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Folder className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
              <p className="text-sm text-gray-500">No contexts found</p>
              <p className="text-xs text-gray-600 mt-1">
                Create contexts to see their previews
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
