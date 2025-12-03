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

import InfoBadge from './InfoBadge';
import FilePathChip from './FilePathChip';
import { getFileType } from './filePatterns';

interface ContextDocumentationProps {
  useCaseId: string; // This is the context ID
  onBack: () => void;
  context: Context | null;
  group: ContextGroup | null;
}

export default function ContextDocumentation({
  onBack,
  context,
  group,
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
            data-testid="context-docs-back-btn"
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
                boxShadow: group
                  ? `0 0 30px ${group.color}20`
                  : '0 0 30px rgba(6, 182, 212, 0.2)',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <FileCode className="w-8 h-8" style={{ color: group?.color || '#06b6d4' }} />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{context.name}</h1>
              {group && <p className="text-gray-400">Part of {group.name} context group</p>}
            </div>
          </div>
        </motion.div>

        {/* Quick Info - Progressive disclosure badges */}
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
              testId="info-badge-group"
            />
          )}
          <InfoBadge
            icon={FileCode}
            label="Files"
            value={filePaths.length}
            color="#06b6d4"
            testId="info-badge-files"
          />
          <InfoBadge
            icon={Code2}
            label="API/Lib"
            value={apiFileCount}
            color="#f59e0b"
            testId="info-badge-api"
          />
          <InfoBadge
            icon={Database}
            label="DB/Schema"
            value={dbFileCount}
            color="#ec4899"
            testId="info-badge-db"
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
              {filePaths.map(path => (
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
                  This context doesn&apos;t have a description yet. Add a description to see it
                  rendered here.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
