'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Requirement, deleteRequirement as apiDeleteRequirement } from '../lib/requirementApi';
import { canDeleteRequirement, getDeleteButtonTitle } from '../lib/requirementUtils';

interface ClaudeRequirementDeleteProps {
  requirement: Requirement;
  projectPath: string;
  onDeleteSuccess: (name: string) => void;
}

export default function ClaudeRequirementDelete({
  requirement,
  projectPath,
  onDeleteSuccess,
}: ClaudeRequirementDeleteProps) {
  const canDelete = canDeleteRequirement(requirement.status);
  const deleteButtonTitle = getDeleteButtonTitle(requirement.status);

  const handleDelete = async () => {
    if (requirement.status === 'queued') {
      return; // Cannot delete queued items
    }

    try {
      const success = await apiDeleteRequirement(projectPath, requirement.name);
      if (success) {
        onDeleteSuccess(requirement.name);
      }
    } catch (err) {
      console.error('Error deleting requirement:', err);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleDelete}
      disabled={!canDelete}
      className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={deleteButtonTitle}
    >
      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
    </motion.button>
  );
}
