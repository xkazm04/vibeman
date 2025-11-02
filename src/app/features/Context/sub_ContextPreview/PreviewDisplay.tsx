'use client';

import React from 'react';
import Image from 'next/image';
import { Image as ImageIcon } from 'lucide-react';

interface PreviewDisplayProps {
  previewPath: string;
  contextName: string;
  imageError: boolean;
  onError: () => void;
}

export default function PreviewDisplay({
  previewPath,
  contextName,
  imageError,
  onError,
}: PreviewDisplayProps) {
  if (!previewPath) return null;

  const imagePath = imageError
    ? null
    : (previewPath.startsWith('/') ? previewPath : `/${previewPath}`);

  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-800/50 border border-gray-700/30">
      {imagePath && !imageError ? (
        <Image
          src={imagePath}
          alt={`${contextName} preview`}
          fill
          className="object-contain"
          onError={onError}
        />
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
  );
}
