/**
 * ContextDocumentation Component - Level 3
 * Detailed markdown documentation view for a specific context
 * Renders context.description in markdown format
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Layers, Code2, Database, FileCode } from 'lucide-react';
import type { Context, ContextGroup } from '@/stores/contextStore';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';

// File path patterns for categorization
const API_PATTERNS = ['/api/', '/services/', '/hooks/', '/lib/'];
const DB_PATTERNS = ['/db/', '/schema/'];

interface ContextDocumentationProps {
  useCaseId: string; // This is the context ID
  onBack: () => void;
  context: Context | null;
  group: ContextGroup | null;
}

// Quick info badge
function InfoBadge({ icon: Icon, label, value, color }: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  color: string;
}) {
  return (
    <div 
      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
      }}
    >
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-xs text-gray-400">{label}:</span>
      <span className="text-sm font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

// File path chip
function FilePathChip({ path, type }: { path: string; type: 'api' | 'db' | 'other' }) {
  const fileName = path.split('/').pop() || path;
  
  const styles = {
    api: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    db: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  
  const icons = {
    api: <Code2 className="w-3 h-3" />,
    db: <Database className="w-3 h-3" />,
    other: <FileCode className="w-3 h-3" />,
  };

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[type]}`}
      title={path}
    >
      {icons[type]}
      {fileName}
    </span>
  );
}

// Categorize a single file path
function getFileType(path: string): 'api' | 'db' | 'other' {
  if (DB_PATTERNS.some(p => path.includes(p))) return 'db';
  if (API_PATTERNS.some(p => path.includes(p))) return 'api';
  return 'other';
}

export default function ContextDocumentation({ 
  onBack,
  context,
  group 
}: ContextDocumentationProps) {

  if (!context) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-50" />
          <p className="text-lg text-gray-400">Context not found</p>
        </div>
      </div>
    );
  }

  const hasDescription = Boolean(context.description);
  const filePaths = context.filePaths || [];
  const apiFileCount = filePaths.filter(p => getFileType(p) === 'api').length;
  const dbFileCount = filePaths.filter(p => getFileType(p) === 'db').length;

  return (
    <motion.div
      className="h-full overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <motion.div 
        className="sticky top-0 z-10 bg-gradient-to-b from-gray-950 via-gray-950/95 to-gray-950/0 pb-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4 px-6 pt-6">
          <motion.button
            onClick={onBack}
            className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            {group && (
              <>
                <span className="text-gray-500 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{group.name}</span>
                </span>
                <span className="text-gray-600">/</span>
              </>
            )}
            <span className="text-white font-medium flex items-center gap-1">
              <FileCode className="w-3.5 h-3.5" />
              <span>{context.name}</span>
            </span>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="px-6 pb-8">
        {/* Title Section */}
        <motion.div 
          className="mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-start gap-4">
            <motion.div 
              className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ 
                background: group 
                  ? `linear-gradient(135deg, ${group.color}30 0%, ${group.color}10 100%)`
                  : 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(6, 182, 212, 0.1) 100%)',
                border: group ? `1px solid ${group.color}40` : '1px solid rgba(6, 182, 212, 0.4)',
                boxShadow: group ? `0 0 30px ${group.color}20` : '0 0 30px rgba(6, 182, 212, 0.2)',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <FileCode className="w-8 h-8" style={{ color: group?.color || '#06b6d4' }} />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{context.name}</h1>
              {group && (
                <p className="text-gray-400">Part of {group.name} context group</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Info */}
        <motion.div 
          className="flex flex-wrap gap-3 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {group && (
            <InfoBadge 
              icon={Layers} 
              label="Group" 
              value={group.name} 
              color={group.color} 
            />
          )}
          <InfoBadge 
            icon={FileCode} 
            label="Files" 
            value={filePaths.length} 
            color="#06b6d4" 
          />
          <InfoBadge 
            icon={Code2} 
            label="API/Lib" 
            value={apiFileCount} 
            color="#f59e0b" 
          />
          <InfoBadge 
            icon={Database} 
            label="DB/Schema" 
            value={dbFileCount} 
            color="#ec4899" 
          />
        </motion.div>

        {/* File Paths */}
        {filePaths.length > 0 && (
          <motion.div 
            className="mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Associated Files
            </h3>
            <div className="flex flex-wrap gap-2">
              {filePaths.map((path) => (
                <FilePathChip key={path} path={path} type={getFileType(path)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Documentation Content */}
        <motion.div
          className="bg-gray-900/40 rounded-2xl border border-gray-700/40 overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {hasDescription ? (
            <div className="p-6">
              <MarkdownViewer content={context.description!} />
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.4 }}
                >
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-50" />
                </motion.div>
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Description</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  This context doesn&apos;t have a description yet. 
                  Add a description to see it rendered here.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
