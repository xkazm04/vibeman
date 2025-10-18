'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, Save, Loader2 } from 'lucide-react';

interface ContextPreviewManagerProps {
  contextId: string;
  currentPreview: string | null;
  contextName: string;
  groupColor: string;
  onPreviewUpdated: (newPreview: string | null) => void;
}

export default function ContextPreviewManager({
  contextId,
  currentPreview,
  contextName,
  groupColor,
  onPreviewUpdated,
}: ContextPreviewManagerProps) {
  const [previewPath, setPreviewPath] = useState(currentPreview || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/contexts/preview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          preview: previewPath.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update preview');
      }

      onPreviewUpdated(previewPath.trim() || null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preview');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setPreviewPath('');
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/contexts/preview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          preview: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove preview');
      }

      onPreviewUpdated(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove preview');
    } finally {
      setIsSaving(false);
    }
  };

  const imagePath = previewPath && !imageError
    ? (previewPath.startsWith('/') ? previewPath : `/${previewPath}`)
    : null;

  const hasChanges = previewPath !== (currentPreview || '');

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Upload className="w-5 h-5" style={{ color: groupColor }} />
          <h5 className="text-lg font-semibold text-gray-300 font-mono">Manage Preview</h5>
        </div>
        {currentPreview && (
          <motion.button
            onClick={handleRemove}
            disabled={isSaving}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-3 h-3 inline-block mr-1" />
            Remove
          </motion.button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2 font-mono">
            Image Path (relative to public folder)
          </label>
          <input
            type="text"
            value={previewPath}
            onChange={(e) => {
              setPreviewPath(e.target.value);
              setImageError(false);
            }}
            placeholder="logo/vibeman_logo.png"
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 font-mono"
          />
          <p className="text-xs text-gray-500 mt-1 font-mono">
            Example: logo/vibeman_logo.png (for public/logo/vibeman_logo.png)
          </p>
        </div>

        {/* Preview */}
        {previewPath && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-800/50 border border-gray-700/30">
            {imagePath && !imageError ? (
              <Image
                src={imagePath}
                alt={`${contextName} preview`}
                fill
                className="object-contain"
                onError={() => setImageError(true)}
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
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex-1">
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 font-mono"
              >
                {error}
              </motion.p>
            )}
          </div>
          <motion.button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-cyan-500/30"
            whileHover={{ scale: hasChanges && !isSaving ? 1.05 : 1 }}
            whileTap={{ scale: hasChanges && !isSaving ? 0.95 : 1 }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Preview</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
