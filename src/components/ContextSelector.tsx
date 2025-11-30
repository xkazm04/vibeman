'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

export interface Context {
  id: string;
  name: string;
  description?: string | null;
  filePaths: string[];
  groupId?: string | null;
  groupName?: string | null;
  groupColor?: string | null;
  preview?: string | null;
}

export interface ContextGroup {
  id: string;
  name: string;
  color: string;
}

interface ContextSelectorProps {
  contexts: Context[];
  contextGroups?: ContextGroup[];
  selectedContext: Context | undefined;
  onSelectContext: (contextId: string | null) => void;
  disabled?: boolean;
  showFullProjectButton?: boolean;
}

// Helper component for context button
interface ContextButtonProps {
  context?: Context;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
  backgroundColor?: string;
}

function ContextButton({
  context,
  isSelected,
  onClick,
  disabled,
  label,
  backgroundColor
}: ContextButtonProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  const baseClasses = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0';
  const selectedClasses = isSelected
    ? `${colors.textLight} border ${colors.borderHover}`
    : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${selectedClasses}`}
      style={{
        backgroundColor: isSelected && backgroundColor ? `${backgroundColor}20` : undefined,
      }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {label}
    </motion.button>
  );
}

export default function ContextSelector({
  contexts,
  contextGroups = [],
  selectedContext,
  onSelectContext,
  disabled = false,
  showFullProjectButton = true
}: ContextSelectorProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  
  if (contexts.length === 0) {
    return null;
  }

  // Group contexts by context group
  const groupedContexts = React.useMemo(() => {
    const grouped: Record<string, Context[]> = {
      ungrouped: [],
    };

    contextGroups.forEach(group => {
      grouped[group.id] = [];
    });

    contexts.forEach(context => {
      if (context.groupId && grouped[context.groupId]) {
        grouped[context.groupId].push(context);
      } else {
        grouped.ungrouped.push(context);
      }
    });

    return grouped;
  }, [contexts, contextGroups]);

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2 mb-2">
        <Folder className={`w-3.5 h-3.5 ${colors.text}`} />
        <span className={`text-sm font-semibold ${colors.textLight}`}>Context Filter</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Full Project Button */}
        {showFullProjectButton && (
          <ContextButton
            isSelected={!selectedContext}
            onClick={() => onSelectContext(null)}
            disabled={disabled}
            label="Full Project"
          />
        )}

        {/* Grouped Contexts with Colored Dividers */}
        {contextGroups.map((group) => {
          const groupContexts = groupedContexts[group.id] || [];
          if (groupContexts.length === 0) return null;

          return (
            <React.Fragment key={group.id}>
              {/* Colored Divider */}
              <div
                className="w-px h-8 self-center"
                style={{ backgroundColor: group.color || '#6b7280' }}
              />

              {/* Group Contexts */}
              {groupContexts.map((context) => (
                <ContextButton
                  key={context.id}
                  context={context}
                  isSelected={selectedContext?.id === context.id}
                  onClick={() => onSelectContext(context.id)}
                  disabled={disabled}
                  label={context.name}
                  backgroundColor={group.color}
                />
              ))}
            </React.Fragment>
          );
        })}

        {/* Ungrouped Contexts */}
        {groupedContexts.ungrouped && groupedContexts.ungrouped.length > 0 && (
          <>
            {contextGroups.length > 0 && (
              <div className="w-px h-8 self-center bg-gray-600" />
            )}
            {groupedContexts.ungrouped.map((context) => (
              <ContextButton
                key={context.id}
                context={context}
                isSelected={selectedContext?.id === context.id}
                onClick={() => onSelectContext(context.id)}
                disabled={disabled}
                label={context.name}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
