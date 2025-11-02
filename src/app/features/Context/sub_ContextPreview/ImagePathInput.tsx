'use client';

import React from 'react';

interface ImagePathInputProps {
  value: string;
  onChange: (value: string) => void;
  onImageError: () => void;
}

export default function ImagePathInput({
  value,
  onChange,
  onImageError,
}: ImagePathInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2 font-mono">
        Image Path (relative to public folder)
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onImageError();
        }}
        placeholder="logo/vibeman_logo.png"
        className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 font-mono"
      />
      <p className="text-sm text-gray-500 mt-1 font-mono">
        Example: logo/vibeman_logo.png (for public/logo/vibeman_logo.png)
      </p>
    </div>
  );
}
