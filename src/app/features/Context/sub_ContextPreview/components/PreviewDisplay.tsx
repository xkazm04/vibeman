'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, X, Maximize2 } from 'lucide-react';

interface PreviewDisplayProps {
  previewPath: string;
  contextName: string;
  imageError: boolean;
  onError: () => void;
  className?: string;
  height?: string;
}

export default function PreviewDisplay({
  previewPath,
  contextName,
  imageError,
  onError,
  className = '',
  height = 'h-48',
}: PreviewDisplayProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!previewPath) return null;

  const imagePath = imageError
    ? null
    : (previewPath.startsWith('/') ? previewPath : `/${previewPath}`);

  return (
    <>
      {/* Thumbnail Preview */}
      <div className={`relative w-full ${height} rounded-lg overflow-hidden bg-gray-800/50 border border-gray-700/30 group ${className}`}>
        {imagePath && !imageError ? (
          <>
            <Image
              src={imagePath}
              alt={`${contextName} preview`}
              fill
              className="object-contain cursor-pointer"
              onError={onError}
              onClick={() => setIsFullScreen(true)}
            />
            {/* Expand overlay hint */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
              onClick={() => setIsFullScreen(true)}
            >
              <div className="flex items-center gap-2 text-white">
                <Maximize2 className="w-6 h-6" />
                <span className="text-sm font-medium">Click to expand</span>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {imageError ? 'Image not found' : 'No preview'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      <AnimatePresence>
        {isFullScreen && imagePath && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100]"
              onClick={() => setIsFullScreen(false)}
            />

            {/* Full Screen Image Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-8"
              onClick={() => setIsFullScreen(false)}
            >
              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullScreen(false);
                }}
                className="absolute top-6 right-6 p-3 rounded-full bg-gray-900/80 hover:bg-gray-800 text-white border border-gray-700 transition-colors z-10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-6 h-6" />
              </motion.button>

              {/* Image Title */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="absolute top-6 left-6 px-4 py-2 rounded-lg bg-gray-900/80 border border-gray-700 z-10"
              >
                <p className="text-sm font-medium text-white font-mono">
                  {contextName}
                </p>
              </motion.div>

              {/* Image */}
              <div
                className="relative w-full h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={imagePath}
                  alt={`${contextName} full screen`}
                  fill
                  className="object-contain"
                  quality={100}
                />
              </div>

              {/* Click anywhere hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-gray-900/80 border border-gray-700 z-10"
              >
                <p className="text-xs text-gray-400 font-mono">
                  Click anywhere to close
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
