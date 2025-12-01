'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageOff, Images, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import ScreenThumbnail from './ScreenThumbnail';

interface ContextWithPreview {
  id: string;
  name: string;
  preview: string;
  groupId?: string | null;
  groupColor?: string | null;
}

interface ContextGroup {
  id: string;
  name: string;
  color: string;
}

interface ScreenGalleryProps {
  projectId: string;
}

export default function ScreenGallery({ projectId }: ScreenGalleryProps) {
  const [contexts, setContexts] = useState<ContextWithPreview[]>([]);
  const [contextGroups, setContextGroups] = useState<ContextGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedContext, setExpandedContext] = useState<ContextWithPreview | null>(null);
  const [expandedImageError, setExpandedImageError] = useState(false);

  // Fetch contexts and groups
  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/contexts?projectId=${projectId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch contexts');
        }

        const data = await response.json();

        if (data.success) {
          const allContexts = data.data.contexts || [];
          const groups = data.data.groups || [];

          // Filter to only contexts with preview and map group colors
          const contextsWithPreview: ContextWithPreview[] = allContexts
            .filter((c: any) => c.preview)
            .map((c: any) => {
              const group = groups.find((g: ContextGroup) => g.id === c.groupId);
              return {
                id: c.id,
                name: c.name,
                preview: c.preview,
                groupId: c.groupId,
                groupColor: group?.color || null,
              };
            });

          setContexts(contextsWithPreview);
          setContextGroups(groups);
        }
      } catch (error) {
        setContexts([]);
        setContextGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContexts();
  }, [projectId]);

  // Handle thumbnail click - expand to modal
  const handleThumbnailClick = (context: ContextWithPreview) => {
    setExpandedContext(context);
    setExpandedImageError(false);
  };

  // Handle navigation in expanded view
  const currentIndex = expandedContext
    ? contexts.findIndex((c) => c.id === expandedContext.id)
    : -1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setExpandedContext(contexts[currentIndex - 1]);
      setExpandedImageError(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < contexts.length - 1) {
      setExpandedContext(contexts[currentIndex + 1]);
      setExpandedImageError(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!expandedContext) return;

      if (e.key === 'Escape') {
        setExpandedContext(null);
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedContext, currentIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-3 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading screenshots...</p>
        </div>
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <ImageOff className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No screenshots available</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Add preview images to your contexts to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header with count badge */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <Images className="w-4 h-4 text-primary/70" />
          <span className="text-xs font-mono text-primary/70">Gallery View</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-full bg-primary/10 text-xs font-mono text-primary/70 border border-primary/20"
          data-testid="screen-gallery-count"
        >
          {contexts.length} screenshot{contexts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Gallery Grid */}
      <div
        className="flex-1 overflow-y-auto p-4 custom-scrollbar"
        data-testid="screen-gallery-grid"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contexts.map((context, index) => (
            <ScreenThumbnail
              key={context.id}
              context={context}
              onClick={() => handleThumbnailClick(context)}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {expandedContext && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100]"
              onClick={() => setExpandedContext(null)}
              data-testid="screen-gallery-modal-backdrop"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-8"
              data-testid="screen-gallery-modal"
            >
              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => setExpandedContext(null)}
                className="absolute top-6 right-6 p-3 rounded-full bg-gray-900/80 hover:bg-gray-800 text-white border border-gray-700 transition-colors z-10"
                data-testid="screen-gallery-modal-close"
              >
                <X className="w-6 h-6" />
              </motion.button>

              {/* Navigation - Previous */}
              {currentIndex > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-gray-900/80 hover:bg-gray-800 text-white border border-gray-700 transition-colors z-10"
                  data-testid="screen-gallery-prev"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
              )}

              {/* Navigation - Next */}
              {currentIndex < contexts.length - 1 && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-gray-900/80 hover:bg-gray-800 text-white border border-gray-700 transition-colors z-10"
                  data-testid="screen-gallery-next"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              )}

              {/* Context Name Title */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="absolute top-6 left-6 px-4 py-2 rounded-lg bg-gray-900/80 border border-gray-700 z-10"
                style={{
                  borderLeftColor: expandedContext.groupColor || '#06b6d4',
                  borderLeftWidth: '4px',
                }}
              >
                <p className="text-sm font-medium text-white font-mono">
                  {expandedContext.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {currentIndex + 1} of {contexts.length}
                </p>
              </motion.div>

              {/* Image */}
              <div
                className="relative w-full max-w-6xl max-h-[80vh] aspect-video"
                onClick={(e) => e.stopPropagation()}
              >
                {!expandedImageError ? (
                  <Image
                    src={
                      expandedContext.preview.startsWith('/')
                        ? expandedContext.preview
                        : `/${expandedContext.preview}`
                    }
                    alt={`${expandedContext.name} expanded`}
                    fill
                    className="object-contain"
                    quality={100}
                    onError={() => setExpandedImageError(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 rounded-lg">
                    <div className="text-center">
                      <ImageOff className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Failed to load image</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Keyboard hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-gray-900/80 border border-gray-700 z-10"
              >
                <p className="text-xs text-gray-400 font-mono">
                  ← → Navigate • ESC Close
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
