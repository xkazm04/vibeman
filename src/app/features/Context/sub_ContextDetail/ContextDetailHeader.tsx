/**
 * Context Detail Header Component
 * Top bar with navigation and action buttons
 */

import React from 'react';
import { ArrowLeft, X, Edit3, Trash2, FolderTree } from 'lucide-react';
import { ContextGroup } from '../../../../stores/contextStore';
import ActionButton from './ActionButton';

interface ContextDetailHeaderProps {
  contextGroup: ContextGroup | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ContextDetailHeader({ 
  contextGroup, 
  onClose, 
  onEdit, 
  onDelete 
}: ContextDetailHeaderProps) {
  return (
    <div 
      className="relative h-20 px-8 flex items-center justify-between border-b border-gray-700/30"
      style={{
        background: `linear-gradient(135deg, ${contextGroup?.color || '#8B5CF6'}15 0%, transparent 50%, ${contextGroup?.color || '#8B5CF6'}05 100%)`
      }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent" />
      
      {/* Left Section - Group Info */}
      <div className="flex items-center space-x-4">
        <ActionButton
          onClick={onClose}
          icon={ArrowLeft}
          variant="secondary"
        />
        
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm"
            style={{
              backgroundColor: `${contextGroup?.color || '#8B5CF6'}20`,
              border: `1px solid ${contextGroup?.color || '#8B5CF6'}30`
            }}
          >
            <FolderTree
              className="w-6 h-6"
              style={{ color: contextGroup?.color || '#8B5CF6' }}
            />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">
              {contextGroup?.name || 'Ungrouped'}
            </h1>
            <p className="text-sm text-gray-400">Context Detail View</p>
          </div>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-3">
        <ActionButton
          onClick={onEdit}
          icon={Edit3}
          variant="primary"
        />

        <ActionButton
          onClick={onDelete}
          icon={Trash2}
          variant="danger"
        />

        <ActionButton
          onClick={onClose}
          icon={X}
          variant="secondary"
        />
      </div>
    </div>
  );
}
