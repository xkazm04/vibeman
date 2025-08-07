import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Context } from '../../../stores/contextStore';
import ContextCard from './ContextCard';

interface ContextSectionProps {
  section: 'left' | 'center' | 'right';
  contexts: Context[];
  title: string;
  className?: string;
}

export default function ContextSection({ section, contexts, title, className = '' }: ContextSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const contextId = e.dataTransfer.getData('text/plain');
    if (contextId) {
      // The context card will handle the actual move
      const event = new CustomEvent('moveContext', {
        detail: { contextId, newSection: section }
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div
      className={`${className} flex flex-col`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Section Header */}
      <div className="px-3 py-2 bg-gray-800/20 border-b border-gray-600/10">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-gray-300 font-mono">{title}</h4>
          <span className="text-xs text-gray-500">{contexts.length}</span>
        </div>
      </div>

      {/* Context Cards */}
      <div
        className={`flex-1 p-2 transition-colors ${
          isDragOver ? 'bg-purple-500/10 border-purple-500/30' : ''
        }`}
      >
        {contexts.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 bg-gray-700/30 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-500">+</span>
              </div>
              <p className="text-xs text-gray-500">Drop contexts here</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 h-full overflow-y-auto">
            {contexts.map((context) => (
              <ContextCard key={context.id} context={context} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}