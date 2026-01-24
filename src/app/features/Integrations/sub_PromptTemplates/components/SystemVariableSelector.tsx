'use client';

/**
 * SystemVariableSelector
 * Manages system variables like ${contextSection} with dropdown selection
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Plus, X, ChevronDown, Folder } from 'lucide-react';
import { UniversalSelect, type SelectOption } from '@/components/ui/UniversalSelect';

// System variable definitions
export interface SystemVariable {
  name: string;
  label: string;
  description: string;
  requiresSelection: boolean;
  selectionType?: 'context' | 'goal' | 'file';
}

export const SYSTEM_VARIABLES: SystemVariable[] = [
  {
    name: 'contextSection',
    label: 'Context',
    description: 'Injects context information (files, description)',
    requiresSelection: true,
    selectionType: 'context',
  },
];

// Context from API
interface Context {
  id: string;
  name: string;
  description?: string | null;
  groupId?: string | null;
  groupColor?: string | null;
}

interface SystemVariableSelectorProps {
  projectId: string;
  selectedVariables: Record<string, string>; // variable name -> selected value
  onChange: (variables: Record<string, string>) => void;
  disabled?: boolean;
}

export function SystemVariableSelector({
  projectId,
  selectedVariables,
  onChange,
  disabled = false,
}: SystemVariableSelectorProps) {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Fetch contexts
  useEffect(() => {
    if (!projectId) return;

    const fetchContexts = async () => {
      setLoadingContexts(true);
      try {
        const response = await fetch(`/api/contexts?projectId=${projectId}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setContexts(data);
        }
      } catch {
        console.error('Failed to load contexts');
      } finally {
        setLoadingContexts(false);
      }
    };

    fetchContexts();
  }, [projectId]);

  // Convert contexts to select options
  const contextOptions: SelectOption[] = useMemo(() => {
    return contexts.map((ctx) => ({
      value: ctx.id,
      label: ctx.name,
      color: ctx.groupColor || undefined,
    }));
  }, [contexts]);

  // Currently enabled system variables
  const enabledVariables = useMemo(() => {
    return SYSTEM_VARIABLES.filter((sv) => sv.name in selectedVariables);
  }, [selectedVariables]);

  // Available (not yet added) system variables
  const availableVariables = useMemo(() => {
    return SYSTEM_VARIABLES.filter((sv) => !(sv.name in selectedVariables));
  }, [selectedVariables]);

  // Add a system variable
  const handleAddVariable = (varName: string) => {
    const sysVar = SYSTEM_VARIABLES.find((sv) => sv.name === varName);
    if (sysVar) {
      onChange({
        ...selectedVariables,
        [varName]: '', // Empty until user selects
      });
    }
    setShowAddDropdown(false);
  };

  // Remove a system variable
  const handleRemoveVariable = (varName: string) => {
    const newVars = { ...selectedVariables };
    delete newVars[varName];
    onChange(newVars);
  };

  // Update variable selection
  const handleSelectionChange = (varName: string, value: string) => {
    onChange({
      ...selectedVariables,
      [varName]: value,
    });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>System Variables</span>
          {enabledVariables.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              {enabledVariables.length}
            </span>
          )}
        </div>

        {/* Add Button */}
        {availableVariables.length > 0 && !disabled && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
              <ChevronDown className={`w-3 h-3 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {showAddDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 z-10 min-w-[200px] bg-gray-800 border border-gray-700/50 rounded-lg shadow-xl overflow-hidden"
                >
                  {availableVariables.map((sysVar) => (
                    <button
                      key={sysVar.name}
                      onClick={() => handleAddVariable(sysVar.name)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="text-sm text-white">${'{'}${sysVar.name}{'}'}</div>
                      <div className="text-xs text-gray-400">{sysVar.description}</div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Enabled Variables */}
      {enabledVariables.length === 0 ? (
        <p className="text-xs text-gray-500 py-2">
          No system variables added. Use <code className="text-cyan-400">${'{'}contextSection{'}'}</code> in your template.
        </p>
      ) : (
        <div className="space-y-2">
          {enabledVariables.map((sysVar) => (
            <motion.div
              key={sysVar.name}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-2 bg-gray-800/40 rounded-lg border border-gray-700/50"
            >
              {/* Variable Name */}
              <code className="text-xs font-mono text-cyan-400 bg-gray-900/50 px-2 py-0.5 rounded shrink-0">
                ${'{'}${sysVar.name}{'}'}
              </code>

              {/* Selection (for context) */}
              {sysVar.selectionType === 'context' && (
                <div className="flex-1">
                  <UniversalSelect
                    value={selectedVariables[sysVar.name] || ''}
                    onChange={(val) => handleSelectionChange(sysVar.name, val)}
                    options={contextOptions}
                    placeholder="Select a context..."
                    isLoading={loadingContexts}
                    disabled={disabled}
                    variant="compact"
                    size="sm"
                    searchable
                    searchPlaceholder="Search contexts..."
                    emptyMessage="No contexts found"
                  />
                </div>
              )}

              {/* Remove Button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveVariable(sysVar.name)}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
