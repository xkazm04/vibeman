/**
 * ModuleExplorer Component - Level 2
 * 3-column layout displaying contexts, API/service files, and database files
 * Uses real context data from the database
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Code2, Database, Layers, ExternalLink, FileCode } from 'lucide-react';
import type { Context, ContextGroup } from '@/stores/contextStore';

interface ModuleExplorerProps {
  moduleId: string; // This is the context group ID
  onBack: () => void;
  onUseCaseSelect: (useCaseId: string) => void;
  group: ContextGroup | null;
  contexts: Context[];
}

// File path patterns for categorization
const API_PATTERNS = ['/api/', '/services/', '/hooks/', '/lib/'];
const DB_PATTERNS = ['/db/', '/schema/'];

// Parse file paths into categories
function categorizeFilePaths(filePaths: string[]): { apiFiles: string[]; dbFiles: string[] } {
  const apiFiles: string[] = [];
  const dbFiles: string[] = [];

  filePaths.forEach(path => {
    const isDb = DB_PATTERNS.some(pattern => path.includes(pattern));
    const isApi = API_PATTERNS.some(pattern => path.includes(pattern));

    if (isDb) {
      dbFiles.push(path);
    } else if (isApi) {
      apiFiles.push(path);
    }
  });

  return { apiFiles, dbFiles };
}

// Get filename from path
function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

// Get folder path from full path
function getFolderPath(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.slice(-2).join('/');
}

// Context Card (left column - use cases)
function ContextCard({
  context,
  isSelected,
  onSelect,
  onNavigate,
}: {
  context: Context;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
}) {
  const hasDescription = Boolean(context.description);

  return (
    <motion.div
      className={`relative p-3 rounded-xl cursor-pointer transition-all border ${
        isSelected
          ? 'bg-cyan-500/20 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
          : 'bg-gray-800/40 border-gray-700/30 hover:bg-gray-800/60 hover:border-gray-600/50'
      }`}
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-white truncate flex-1">{context.name}</h4>
        
        {isSelected && hasDescription && (
          <motion.button
            className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            title="View documentation"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// File Card (for API and DB files)
function FileCard({
  filePath,
  type,
}: {
  filePath: string;
  type: 'api' | 'db';
}) {
  const fileName = getFileName(filePath);
  const folderPath = getFolderPath(filePath);

  return (
    <motion.div
      className="relative p-3 rounded-xl border transition-all bg-gray-800/40 border-gray-700/30"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded-lg ${type === 'api' ? 'bg-amber-500/20' : 'bg-pink-500/20'}`}>
          {type === 'api' ? (
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Database className="w-3.5 h-3.5 text-pink-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="text-xs font-medium text-white truncate">{fileName}</h5>
          <p className="text-[10px] text-gray-500 truncate">{folderPath}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Empty state for columns
function EmptyColumn({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
      {message}
    </div>
  );
}

export default function ModuleExplorer({ 
  onBack, 
  onUseCaseSelect,
  group,
  contexts 
}: ModuleExplorerProps) {
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);

  // Get selected context
  const selectedContext = contexts.find(c => c.id === selectedContextId);
  
  // Categorize file paths for selected context
  const { apiFiles, dbFiles } = useMemo(() => {
    if (!selectedContext) return { apiFiles: [], dbFiles: [] };
    return categorizeFilePaths(selectedContext.filePaths || []);
  }, [selectedContext]);

  if (!group) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Context group not found</p>
      </div>
    );
  }

  return (
    <motion.div
      className="relative h-full min-h-[600px] overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 px-4 pt-4">
        <motion.button
          onClick={onBack}
          className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${group.color}30 0%, ${group.color}10 100%)`,
              border: `1px solid ${group.color}40`,
            }}
          >
            <FileCode className="w-5 h-5" style={{ color: group.color }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{group.name}</h2>
            <p className="text-xs text-gray-400">{contexts.length} contexts</p>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="relative grid grid-cols-3 gap-4 px-4 pb-4" style={{ minHeight: 'calc(100% - 80px)' }}>
        {/* Left Column: Contexts (Use Cases) */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-medium text-cyan-400">Contexts</h3>
            <span className="text-xs text-gray-500">({contexts.length})</span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-hidden">
            {contexts.length === 0 ? (
              <EmptyColumn message="No contexts in this group" />
            ) : (
              <AnimatePresence>
                {contexts.map((context, index) => (
                  <motion.div
                    key={context.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ContextCard
                      context={context}
                      isSelected={selectedContextId === context.id}
                      onSelect={() => setSelectedContextId(context.id === selectedContextId ? null : context.id)}
                      onNavigate={() => onUseCaseSelect(context.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Middle Column: API/Service/Hook/Lib Files */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-medium text-amber-400">API / Services / Hooks / Lib</h3>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {!selectedContextId ? (
              <EmptyColumn message="Select a context to see files" />
            ) : apiFiles.length === 0 ? (
              <EmptyColumn message="No matching files" />
            ) : (
              <AnimatePresence>
                {apiFiles.map((filePath, index) => (
                  <motion.div
                    key={filePath}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="relative"
                  >
                    <FileCard filePath={filePath} type="api" />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Column: DB/Schema Files */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-pink-400" />
            <h3 className="text-sm font-medium text-pink-400">Database / Schema</h3>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {!selectedContextId ? (
              <EmptyColumn message="Select a context to see files" />
            ) : dbFiles.length === 0 ? (
              <EmptyColumn message="No matching files" />
            ) : (
              <AnimatePresence>
                {dbFiles.map((filePath, index) => (
                  <motion.div
                    key={filePath}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                  >
                    <FileCard filePath={filePath} type="db" />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Hint */}
      <motion.div
        className="absolute bottom-4 left-4 text-xs text-gray-500 font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Select a context to see related files
      </motion.div>
    </motion.div>
  );
}
