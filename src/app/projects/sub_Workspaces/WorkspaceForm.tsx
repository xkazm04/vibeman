'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FolderOpen, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { DbWorkspace } from '@/app/db/models/types';
import { useUserConfigStore } from '@/stores/userConfigStore';
import FolderBrowserInput from './FolderBrowserInput';

const COLORS: { hex: string; name: string }[] = [
  { hex: '#6366f1', name: 'indigo' },
  { hex: '#8b5cf6', name: 'violet' },
  { hex: '#ec4899', name: 'pink' },
  { hex: '#ef4444', name: 'red' },
  { hex: '#f97316', name: 'orange' },
  { hex: '#eab308', name: 'yellow' },
  { hex: '#22c55e', name: 'green' },
  { hex: '#06b6d4', name: 'cyan' },
];

interface WorkspaceFormProps {
  workspace?: DbWorkspace | null;
  onSubmit: (data: { name: string; description?: string; color: string; basePath?: string }) => void;
  onCancel: () => void;
}

export default function WorkspaceForm({ workspace, onSubmit, onCancel }: WorkspaceFormProps) {
  const { basePath: defaultBasePath } = useUserConfigStore();
  const [name, setName] = useState(workspace?.name || '');
  const [description, setDescription] = useState(workspace?.description || '');
  const [color, setColor] = useState(workspace?.color || COLORS[0].hex);
  const [basePath, setBasePath] = useState(workspace?.base_path || '');
  const [showAdvanced, setShowAdvanced] = useState(!!workspace?.base_path);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      basePath: basePath.trim() || undefined,
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={handleSubmit}
      className="p-4 bg-gray-800/60 border border-gray-700/40 rounded-lg space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">
          {workspace ? 'Edit Workspace' : 'New Workspace'}
        </span>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="text-gray-500 hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label htmlFor="workspace-name" className="sr-only">Workspace name</label>
        <input
          id="workspace-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Workspace name"
          className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700/40 rounded-md text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="workspace-description" className="sr-only">Description (optional)</label>
        <input
          id="workspace-description"
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700/40 rounded-md text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">Workspace color</legend>
        <span className="text-xs text-gray-500" aria-hidden="true">Color:</span>
        {COLORS.map(({ hex, name }) => {
          const isSelected = color === hex;
          return (
            <button
              key={hex}
              type="button"
              onClick={() => setColor(hex)}
              aria-label={`Select ${name} color`}
              aria-pressed={isSelected}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                isSelected
                  ? 'scale-110 ring-2 ring-offset-2 ring-offset-[#0f0f23] ring-white'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: hex }}
            >
              {isSelected && (
                <Check className="w-3 h-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
              )}
            </button>
          );
        })}
      </fieldset>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Advanced settings
      </button>

      {/* Base Path (Advanced) */}
      {showAdvanced && (
        <div className="space-y-2 pt-1 border-t border-gray-700/40">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-400">Projects Root Path</span>
          </div>
          <FolderBrowserInput
            value={basePath}
            onChange={setBasePath}
            placeholder={defaultBasePath || 'e.g., C:\\Projects\\ClientA'}
            defaultPaths={defaultBasePath ? [defaultBasePath] : []}
          />
          <p className="text-2xs text-gray-600">
            Optional. Set a root directory for projects in this workspace.
            {defaultBasePath && (
              <button
                type="button"
                onClick={() => setBasePath(defaultBasePath)}
                className="ml-1 text-blue-400 hover:text-blue-300"
              >
                Use default ({defaultBasePath})
              </button>
            )}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-3 py-1.5 text-xs bg-blue-600/80 text-white rounded-md hover:bg-blue-500/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {workspace ? 'Save' : 'Create'}
        </button>
      </div>
    </motion.form>
  );
}
