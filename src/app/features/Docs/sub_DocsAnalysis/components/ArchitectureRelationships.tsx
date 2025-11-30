/**
 * ArchitectureRelationships Component
 * Manages connections between context groups for Architecture Explorer
 * Space-efficient list with two dropdowns and action buttons
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Link2, AlertCircle } from 'lucide-react';
import type { ContextGroup } from '@/stores/context/contextStoreTypes';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

interface ArchitectureRelationshipsProps {
  groups: ContextGroup[];
  relationships: ContextGroupRelationship[];
  onCreateRelationship: (sourceGroupId: string, targetGroupId: string) => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
  loading?: boolean;
}

// New Relationship Form
function NewRelationshipForm({
  groups,
  onSubmit,
  disabled,
}: {
  groups: ContextGroup[];
  onSubmit: (sourceGroupId: string, targetGroupId: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build options with colors, excluding the other selection
  const sourceOptions = useMemo(() => {
    return groups
      .filter(g => g.id !== targetId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(g => ({ value: g.id, label: g.name, color: g.color }));
  }, [groups, targetId]);

  const targetOptions = useMemo(() => {
    return groups
      .filter(g => g.id !== sourceId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(g => ({ value: g.id, label: g.name, color: g.color }));
  }, [groups, sourceId]);

  const canSubmit = sourceId && targetId && sourceId !== targetId && !disabled && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      await onSubmit(sourceId, targetId);
      setSourceId('');
      setTargetId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 bg-gray-800/30 rounded-lg border border-gray-700/30">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <UniversalSelect
            value={sourceId}
            onChange={setSourceId}
            options={sourceOptions}
            placeholder="From..."
            disabled={disabled || isSubmitting}
            variant="compact"
            size="sm"
            emptyMessage="No groups available"
          />
        </div>
        
        <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <UniversalSelect
            value={targetId}
            onChange={setTargetId}
            options={targetOptions}
            placeholder="To..."
            disabled={disabled || isSubmitting}
            variant="compact"
            size="sm"
            emptyMessage="No groups available"
          />
        </div>
        
        <motion.button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`p-1.5 rounded-md transition-all flex-shrink-0 ${
            canSubmit
              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
              : 'bg-gray-700/30 text-gray-500 cursor-not-allowed border border-gray-700/30'
          }`}
          whileHover={canSubmit ? { scale: 1.05 } : undefined}
          whileTap={canSubmit ? { scale: 0.95 } : undefined}
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>
      
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// Existing Relationship Row
function RelationshipRow({
  relationship,
  groups,
  onDelete,
  disabled,
}: {
  relationship: ContextGroupRelationship;
  groups: ContextGroup[];
  onDelete: (id: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const sourceGroup = groups.find(g => g.id === relationship.sourceGroupId);
  const targetGroup = groups.find(g => g.id === relationship.targetGroupId);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(relationship.id);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!sourceGroup || !targetGroup) {
    return null;
  }

  return (
    <motion.div
      className="flex items-center gap-2 px-2 py-1.5 bg-gray-800/20 rounded-lg border border-gray-700/20"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      layout
    >
      {/* Source */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: sourceGroup.color }}
        />
        <span className="text-xs text-gray-300 truncate">{sourceGroup.name}</span>
      </div>
      
      {/* Arrow */}
      <Link2 className="w-3 h-3 text-gray-600 flex-shrink-0" />
      
      {/* Target */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: targetGroup.color }}
        />
        <span className="text-xs text-gray-300 truncate">{targetGroup.name}</span>
      </div>
      
      {/* Delete Button */}
      <motion.button
        onClick={handleDelete}
        disabled={disabled || isDeleting}
        className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Trash2 className="w-3 h-3" />
      </motion.button>
    </motion.div>
  );
}

export default function ArchitectureRelationships({
  groups,
  relationships,
  onCreateRelationship,
  onDeleteRelationship,
  loading = false,
}: ArchitectureRelationshipsProps) {
  return (
    <div className="flex flex-col gap-2 p-3 h-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Connections ({relationships.length})
        </h3>
      </div>

      {/* New Relationship Form */}
      <NewRelationshipForm
        groups={groups}
        onSubmit={onCreateRelationship}
        disabled={loading || groups.length < 2}
      />

      {/* Existing Relationships */}
      <div className="flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="popLayout">
          {relationships.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-500 text-center py-2"
            >
              No connections yet
            </motion.div>
          ) : (
            relationships.map((rel) => (
              <RelationshipRow
                key={rel.id}
                relationship={rel}
                groups={groups}
                onDelete={onDeleteRelationship}
                disabled={loading}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
