/**
 * ArchitectureGroupList Component
 * Space-efficient list of context groups for Architecture Explorer
 * Displays icon, editable name, and type selector for each group
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code, Database, Layers, Grid, Activity, Cpu, Zap, Settings,
  Globe, Shield, Users, FileText, Box, Terminal, Workflow, Server,
  ChevronDown, Check, Pencil
} from 'lucide-react';
import type { ContextGroup } from '@/stores/context/contextStoreTypes';

// Layer type configuration matching SystemMap
const LAYER_TYPE_CONFIG = {
  pages: { label: 'Pages', color: '#f472b6' },
  client: { label: 'Client', color: '#06b6d4' },
  server: { label: 'Server', color: '#f59e0b' },
  external: { label: 'External', color: '#8b5cf6' },
} as const;

type LayerType = keyof typeof LAYER_TYPE_CONFIG | null;

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Code, Database, Layers, Grid, Activity, Cpu, Zap, Settings,
  Globe, Shield, Users, FileText, Box, Terminal, Workflow, Server,
};

interface ArchitectureGroupListProps {
  groups: ContextGroup[];
  onUpdateGroup: (groupId: string, updates: { name?: string; type?: LayerType }) => Promise<void>;
  loading?: boolean;
}

// Type Selector Dropdown
function TypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: LayerType;
  onChange: (type: LayerType) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { value: null, label: '—' },
    ...Object.entries(LAYER_TYPE_CONFIG).map(([key, config]) => ({
      value: key as LayerType,
      label: config.label,
      color: config.color,
    })),
  ];

  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const selectedColor = value ? LAYER_TYPE_CONFIG[value].color : undefined;

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all min-w-[70px] justify-between ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-800/30 border-gray-700/30'
            : 'hover:bg-gray-700/50 bg-gray-800/40 border-gray-700/40 cursor-pointer'
        }`}
        style={selectedColor ? { borderColor: `${selectedColor}50`, color: selectedColor } : undefined}
      >
        <span className={!value ? 'text-gray-500' : ''}>{selectedOption.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="absolute top-full left-0 mt-1 w-24 bg-gray-800 border border-gray-700/50 rounded-lg shadow-xl z-20 overflow-hidden"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {options.map((option) => (
                <button
                  key={option.value ?? 'none'}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2 py-1.5 text-xs text-left hover:bg-gray-700/50 flex items-center justify-between transition-colors ${
                    value === option.value ? 'bg-gray-700/30' : ''
                  }`}
                  style={option.value && 'color' in option ? { color: option.color } : undefined}
                >
                  <span className={!option.value ? 'text-gray-500' : ''}>{option.label}</span>
                  {value === option.value && <Check className="w-3 h-3" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Editable Name Field
function EditableName({
  value,
  onSave,
  disabled,
}: {
  value: string;
  onSave: (name: string) => void;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim());
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 min-w-0"
        maxLength={30}
      />
    );
  }

  return (
    <div className="flex-1 flex items-center gap-1 group min-w-0">
      <span className="text-sm text-gray-200 truncate">{value}</span>
      {!disabled && (
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-700/50 rounded transition-opacity"
        >
          <Pencil className="w-3 h-3 text-gray-500" />
        </button>
      )}
    </div>
  );
}

// Single Group Row
function GroupRow({
  group,
  onUpdateGroup,
  disabled,
}: {
  group: ContextGroup;
  onUpdateGroup: (groupId: string, updates: { name?: string; type?: LayerType }) => Promise<void>;
  disabled?: boolean;
}) {
  const IconComponent = group.icon ? ICON_MAP[group.icon] || Code : Code;
  const layerType = group.type as LayerType;
  const bgColor = layerType ? LAYER_TYPE_CONFIG[layerType].color : undefined;

  const handleNameSave = useCallback(async (name: string) => {
    await onUpdateGroup(group.id, { name });
  }, [group.id, onUpdateGroup]);

  const handleTypeChange = useCallback(async (type: LayerType) => {
    await onUpdateGroup(group.id, { type });
  }, [group.id, onUpdateGroup]);

  return (
    <motion.div
      className="flex items-center gap-3 px-3 py-2 rounded-lg border transition-all"
      style={{
        backgroundColor: bgColor ? `${bgColor}10` : 'rgba(31, 41, 55, 0.3)',
        borderColor: bgColor ? `${bgColor}30` : 'rgba(75, 85, 99, 0.3)',
      }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      layout
    >
      {/* Icon */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `${group.color}25`,
          borderColor: `${group.color}40`,
        }}
      >
        <IconComponent className="w-4 h-4" style={{ color: group.color }} />
      </div>

      {/* Name */}
      <EditableName
        value={group.name}
        onSave={handleNameSave}
        disabled={disabled}
      />

      {/* Type Selector */}
      <TypeSelector
        value={layerType}
        onChange={handleTypeChange}
        disabled={disabled}
      />
    </motion.div>
  );
}

export default function ArchitectureGroupList({
  groups,
  onUpdateGroup,
  loading = false,
}: ArchitectureGroupListProps) {
  // Sort groups by name ascending
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  if (groups.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No context groups found. Create groups in the Context tab to see them here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-3 h-full overflow-y-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Context Groups ({sortedGroups.length})
        </h3>
      </div>

      <AnimatePresence mode="popLayout">
        {sortedGroups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            onUpdateGroup={onUpdateGroup}
            disabled={loading}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
