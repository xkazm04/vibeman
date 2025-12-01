'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ImageIcon } from 'lucide-react';

interface ContextWithPreview {
  id: string;
  name: string;
  preview: string;
  groupId?: string | null;
  groupColor?: string | null;
}

interface ScreenThumbnailProps {
  context: ContextWithPreview;
  onClick: () => void;
  index?: number;
}

export default function ScreenThumbnail({ context, onClick, index = 0 }: ScreenThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const imagePath = context.preview.startsWith('/') ? context.preview : `/${context.preview}`;
  const groupColor = context.groupColor || '#06b6d4'; // cyan-500 default

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    setMousePosition({ x: x * -5, y: y * -5 }); // Opposite direction for parallax
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePosition({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative cursor-pointer"
      data-testid={`screen-thumbnail-${context.id}`}
    >
      {/* Container with aspect ratio */}
      <div
        className="relative aspect-video overflow-hidden rounded-lg bg-gray-800/50 border-2 transition-all duration-300 group-hover:shadow-lg"
        style={{
          borderColor: groupColor,
          borderLeftWidth: '4px',
        }}
      >
        {/* Image with parallax effect */}
        {!imageError ? (
          <motion.div
            className="absolute inset-0"
            animate={{
              x: mousePosition.x,
              y: mousePosition.y,
              scale: 1.02,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Image
              src={imagePath}
              alt={`${context.name} preview`}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-600" />
          </div>
        )}

        {/* Hover overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"
        />

        {/* Hover scale effect overlay */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            boxShadow: `inset 0 0 20px ${groupColor}30`,
          }}
        />
      </div>

      {/* Context name */}
      <div className="mt-2 px-1">
        <p
          className="text-xs font-medium text-gray-300 truncate group-hover:text-white transition-colors"
          title={context.name}
        >
          {context.name}
        </p>
      </div>

      {/* Subtle glow on hover */}
      <motion.div
        className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"
        style={{
          background: `linear-gradient(135deg, ${groupColor}20, transparent)`,
        }}
      />
    </motion.div>
  );
}
