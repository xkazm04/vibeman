'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';

interface ClaudeRequirementInputProps {
  projectPath: string;
  onRequirementCreated: () => void;
}

export default function ClaudeRequirementInput({
  projectPath,
  onRequirementCreated,
}: ClaudeRequirementInputProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) {
      setError('Both name and description are required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/claude-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          action: 'create-requirement',
          requirementName: name,
          content: description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create requirement');
      }

      setName('');
      setDescription('');
      onRequirementCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full p-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-lg border border-gray-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Name Input - 30% */}
        <div className="flex-[0_0_30%]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Requirement name (e.g., add-auth)"
            className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
            disabled={isCreating}
          />
        </div>

        {/* Description Input - 60% */}
        <div className="flex-[0_0_60%]">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (what should Claude Code do?)"
            className="w-full px-3 py-2 bg-gray-900/70 border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
            disabled={isCreating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isCreating) {
                handleCreate();
              }
            }}
          />
        </div>

        {/* Create Button - 10% */}
        <div className="flex-[0_0_10%]">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || !description.trim()}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              isCreating || !name.trim() || !description.trim()
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg'
            }`}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md"
        >
          <p className="text-red-400 text-xs">{error}</p>
        </motion.div>
      )}
    </div>
  );
}
