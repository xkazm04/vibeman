/**
 * Component Column
 * A column in the three-column composer layout showing components of a specific type
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { ChevronRight, Check, X, Settings, Zap, Brain } from 'lucide-react';
import { ComponentMeta, PromptMeta, AnalyzerCategory } from '../types';

interface ComponentColumnProps {
  title: string;
  type: 'analyzer' | 'processor' | 'executor';
  components: ComponentMeta[];
  selectedIds: string[];
  onSelect: (component: ComponentMeta) => void;
  onDeselect?: (componentId: string) => void;
  multiSelect?: boolean;
  // For analyzers
  analyzerCategory?: AnalyzerCategory;
  onCategoryChange?: (category: AnalyzerCategory) => void;
  // For business analyzers
  selectedPrompt?: PromptMeta;
  onPromptSelect?: (prompt: PromptMeta) => void;
  // For processors
  onConfigClick?: (component: ComponentMeta) => void;
}

// Get Lucide icon by name
function getIcon(name: string): React.ElementType {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[name];
  return IconComponent || LucideIcons.Circle;
}

export default function ComponentColumn({
  title,
  type,
  components,
  selectedIds,
  onSelect,
  onDeselect,
  multiSelect = false,
  analyzerCategory,
  onCategoryChange,
  selectedPrompt,
  onPromptSelect,
  onConfigClick,
}: ComponentColumnProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hoveredComponent = useMemo(() =>
    components.find(c => c.id === hoveredId),
    [components, hoveredId]
  );

  const selectedComponent = useMemo(() =>
    components.find(c => selectedIds.includes(c.id)),
    [components, selectedIds]
  );

  // For business analyzer, show prompts when selected
  const showPrompts = type === 'analyzer' &&
    analyzerCategory === 'business' &&
    selectedComponent?.availablePrompts;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${
            type === 'analyzer' ? 'bg-cyan-400' :
            type === 'processor' ? 'bg-violet-400' :
            'bg-emerald-400'
          }`} />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {title}
          </span>
          {selectedIds.length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-gray-800 text-gray-400 rounded">
              {selectedIds.length}
            </span>
          )}
        </div>

        {/* Analyzer category switcher */}
        {type === 'analyzer' && onCategoryChange && (
          <div className="flex items-center bg-gray-900/80 rounded-lg p-0.5">
            <button
              onClick={() => onCategoryChange('technical')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                analyzerCategory === 'technical'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              <Zap className="w-3 h-3" />
              Technical
            </button>
            <button
              onClick={() => onCategoryChange('business')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                analyzerCategory === 'business'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              <Brain className="w-3 h-3" />
              Business
            </button>
          </div>
        )}
      </div>

      {/* Component List */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Compact list */}
        <div className={`${showPrompts ? 'w-1/2' : 'w-1/2'} overflow-y-auto border-r border-gray-800/30`}>
          <div className="p-2 space-y-1">
            {components.map((component) => {
              const Icon = getIcon(component.icon);
              const isSelected = selectedIds.includes(component.id);
              const isHovered = hoveredId === component.id;
              const isExpanded = expandedId === component.id;

              return (
                <motion.div
                  key={component.id}
                  onMouseEnter={() => setHoveredId(component.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    if (isSelected && onDeselect) {
                      onDeselect(component.id);
                    } else if (!isSelected || multiSelect) {
                      onSelect(component);
                    }
                  }}
                  className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-gray-800/80'
                      : isHovered
                      ? 'bg-gray-800/40'
                      : 'hover:bg-gray-800/20'
                  }`}
                  style={{
                    borderLeft: isSelected ? `2px solid ${component.color}` : '2px solid transparent',
                  }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Icon */}
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${component.color}15`,
                    }}
                  >
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{ color: component.color }}
                    />
                  </div>

                  {/* Name */}
                  <span className={`text-xs font-medium truncate ${
                    isSelected ? 'text-white' : 'text-gray-400'
                  }`}>
                    {component.name}
                  </span>

                  {/* Selection indicator */}
                  <div className="ml-auto flex items-center gap-1">
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: component.color }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </motion.div>
                    )}

                    {isSelected && multiSelect && onDeselect && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeselect(component.id);
                        }}
                        className="p-0.5 rounded hover:bg-gray-700/50 transition-colors"
                      >
                        <X className="w-3 h-3 text-gray-500" />
                      </button>
                    )}

                    {isSelected && onConfigClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfigClick(component);
                        }}
                        className="p-0.5 rounded hover:bg-gray-700/50 transition-colors"
                      >
                        <Settings className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {components.length === 0 && (
              <div className="text-center py-6 text-gray-600 text-xs">
                No components available
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail view or prompts */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {showPrompts && selectedComponent?.availablePrompts ? (
              /* Prompt selection for business analyzer */
              <motion.div
                key="prompts"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-3"
              >
                <div className="text-[10px] font-medium text-amber-400/70 uppercase tracking-wider mb-2">
                  Select Prompt Persona
                </div>
                <div className="space-y-1">
                  {selectedComponent.availablePrompts.map((prompt) => {
                    const PromptIcon = getIcon(prompt.icon);
                    const isPromptSelected = selectedPrompt?.id === prompt.id;

                    return (
                      <motion.button
                        key={prompt.id}
                        onClick={() => onPromptSelect?.(prompt)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                          isPromptSelected
                            ? 'bg-amber-500/20 border border-amber-500/30'
                            : 'hover:bg-gray-800/40 border border-transparent'
                        }`}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                          isPromptSelected ? 'bg-amber-500/30' : 'bg-gray-800'
                        }`}>
                          <PromptIcon className={`w-3 h-3 ${
                            isPromptSelected ? 'text-amber-400' : 'text-gray-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium truncate ${
                            isPromptSelected ? 'text-amber-300' : 'text-gray-400'
                          }`}>
                            {prompt.name}
                          </div>
                        </div>
                        {isPromptSelected && (
                          <Check className="w-3 h-3 text-amber-400" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : hoveredComponent ? (
              /* Component detail view */
              <motion.div
                key={hoveredComponent.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-3"
              >
                {/* Header */}
                <div className="flex items-start gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${hoveredComponent.color}20` }}
                  >
                    {React.createElement(getIcon(hoveredComponent.icon), {
                      className: 'w-4 h-4',
                      style: { color: hoveredComponent.color },
                    })}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {hoveredComponent.name}
                    </div>
                    <div
                      className="text-[10px] font-mono uppercase"
                      style={{ color: hoveredComponent.color }}
                    >
                      {hoveredComponent.componentId}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  {hoveredComponent.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {hoveredComponent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-[9px] font-mono bg-gray-800 text-gray-500 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Compatible processors hint for analyzers */}
                {type === 'analyzer' && hoveredComponent.compatibleProcessors && (
                  <div className="mt-3 pt-3 border-t border-gray-800/50">
                    <div className="text-[10px] text-gray-600 mb-1">
                      Compatible with:
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {hoveredComponent.compatibleProcessors.join(', ')}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Empty state */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center p-4"
              >
                <div className="text-center">
                  <ChevronRight className="w-5 h-5 text-gray-700 mx-auto mb-2" />
                  <p className="text-[10px] text-gray-600">
                    Hover to preview
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
