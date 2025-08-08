import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, Palette, Grid3X3 } from 'lucide-react';
import { ContextGroup, useContextStore, CONTEXT_GROUP_COLORS } from '../../../../stores/contextStore';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  groups: ContextGroup[];
}

export default function GroupManagementModal({ isOpen, onClose, projectId, groups }: GroupManagementModalProps) {
  const { addGroup, removeGroup, updateGroup, loading } = useContextStore();
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CONTEXT_GROUP_COLORS[0]);
  const [error, setError] = useState('');

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (groups.some(g => g.name.toLowerCase() === newGroupName.toLowerCase())) {
      setError('A group with this name already exists');
      return;
    }

    try {
      await addGroup({
        projectId,
        name: newGroupName.trim(),
        color: selectedColor,
      });
      
      setNewGroupName('');
      setSelectedColor(CONTEXT_GROUP_COLORS[groups.length % CONTEXT_GROUP_COLORS.length]);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create group');
    }
  };

  const handleUpdateGroup = async (groupId: string, updates: { name?: string; color?: string }) => {
    try {
      await updateGroup(groupId, updates);
      setEditingGroup(null);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure? This will delete all contexts in this group.')) {
      return;
    }

    try {
      await removeGroup(groupId);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete group');
    }
  };

  const handleClose = () => {
    setEditingGroup(null);
    setNewGroupName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <Grid3X3 className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white font-mono">Manage Context Groups</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-700 rounded-sm transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
            {/* Create New Group */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-300">Create New Group</h3>
              
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => {
                      setNewGroupName(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g., Frontend Components"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    maxLength={30}
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Color</label>
                  <div className="flex space-x-1">
                    {CONTEXT_GROUP_COLORS.slice(0, 5).map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          selectedColor === color ? 'border-white scale-110' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleCreateGroup}
                  disabled={loading || groups.length >= 9}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
              
              {groups.length >= 9 && (
                <p className="text-xs text-yellow-400">Maximum of 9 groups allowed</p>
              )}
            </div>

            {/* Existing Groups */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-300">
                Existing Groups ({groups.length}/9)
              </h3>
              
              {groups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No groups created yet</p>
                  <p className="text-xs text-gray-600">Create your first group above</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-3 bg-gray-700/30 border border-gray-600/30 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        
                        {editingGroup === group.id ? (
                          <input
                            type="text"
                            defaultValue={group.name}
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== group.name) {
                                handleUpdateGroup(group.id, { name: e.target.value.trim() });
                              } else {
                                setEditingGroup(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              } else if (e.key === 'Escape') {
                                setEditingGroup(null);
                              }
                            }}
                            className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500"
                            autoFocus
                          />
                        ) : (
                          <div>
                            <span className="text-sm font-medium text-white font-mono">
                              {group.name}
                            </span>
                            <p className="text-xs text-gray-400">
                              Position {group.position}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Color Picker */}
                        <div className="flex space-x-1">
                          {CONTEXT_GROUP_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => handleUpdateGroup(group.id, { color })}
                              className={`w-4 h-4 rounded-full border transition-all ${
                                group.color === color ? 'border-white scale-110' : 'border-gray-600 hover:border-gray-400'
                              }`}
                              style={{ backgroundColor: color }}
                              title={`Change to ${color}`}
                            />
                          ))}
                        </div>
                        
                        <button
                          onClick={() => setEditingGroup(group.id)}
                          className="p-1 hover:bg-gray-600/50 rounded-sm transition-colors"
                          title="Rename group"
                        >
                          <Edit2 className="w-3 h-3 text-gray-400" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-sm transition-colors"
                          title="Delete group"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}