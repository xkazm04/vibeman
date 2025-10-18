'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Image as ImageIcon, Maximize2, X } from 'lucide-react';

interface ContextPreviewImageProps {
  preview: string;
  contextName: string;
  groupColor: string;
}

export default function ContextPreviewImage({
  preview,
  contextName,
  groupColor,
}: ContextPreviewImageProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Construct the full path - preview is relative to public folder
  // Example: preview = "logo/vibeman_logo.png" -> /logo/vibeman_logo.png
  const imagePath = preview.startsWith('/') ? preview : `/${preview}`;

  if (imageError) {
    return (
      <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30">
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Preview image not found</p>
            <p className="text-xs text-gray-600 mt-1">{preview}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5" style={{ color: groupColor }} />
            <h5 className="text-lg font-semibold text-gray-300 font-mono">Preview</h5>
          </div>
          <motion.button
            onClick={() => setIsFullscreen(true)}
            className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </motion.button>
        </div>

        <div className="relative w-full h-64 rounded-xl overflow-hidden bg-gray-800/50 border border-gray-700/30">
          <Image
            src={imagePath}
            alt={`${contextName} preview`}
            fill
            className="object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
          onClick={() => setIsFullscreen(false)}
        >
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 p-3 bg-gray-800/80 hover:bg-gray-700/80 rounded-full transition-colors z-10"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full h-full max-w-7xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={imagePath}
              alt={`${contextName} preview (fullscreen)`}
              fill
              className="object-contain"
              onError={() => setImageError(true)}
            />
          </motion.div>

          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50">
            <p className="text-sm text-gray-300 font-mono">{contextName}</p>
          </div>
        </motion.div>
      )}
    </>
  );
}
