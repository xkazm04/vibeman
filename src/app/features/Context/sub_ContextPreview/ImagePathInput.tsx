'use client';

import React from 'react';
import { inputStyle } from '@/lib/design-tokens';

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
        className={`w-full ${inputStyle} font-mono`}
        data-testid="context-preview-path-input"
      />
      <p className="text-sm text-gray-500 mt-1 font-mono">
        Example: logo/vibeman_logo.png (for public/logo/vibeman_logo.png)
      </p>
    </div>
  );
}
