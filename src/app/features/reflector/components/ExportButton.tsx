'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileJson, FileText, Check } from 'lucide-react';
import { DbIdea } from '@/app/db';

interface ExportButtonProps {
  ideas: DbIdea[];
  filename?: string;
  className?: string;
  /** 'full' shows dropdown with CSV/JSON options, 'compact' does single-click JSON export */
  variant?: 'full' | 'compact';
}

type ExportFormat = 'csv' | 'json';

/**
 * Shared export data builder for JSON format
 */
function buildJsonExportData(ideas: DbIdea[]) {
  return ideas.map(idea => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    category: idea.category,
    status: idea.status,
    projectId: idea.project_id,
    contextId: idea.context_id,
    scanType: idea.scan_type,
    impact: idea.impact,
    effort: idea.effort,
    risk: idea.risk,
    created_at: idea.created_at,
    updated_at: idea.updated_at,
  }));
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(str: string): string {
  if (!str) return '';
  // If contains comma, newline, or quote, wrap in quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    // Escape quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Download file helper
 */
function downloadFile(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ExportButton - Export ideas to CSV or JSON format
 *
 * Supports two variants:
 * - 'full' (default): Dropdown with CSV/JSON options
 * - 'compact': Single-click JSON export (icon-only button)
 */
export default function ExportButton({
  ideas,
  filename = 'ideas-export',
  className = '',
  variant = 'full',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [success, setSuccess] = useState<ExportFormat | null>(null);

  const dateStamp = new Date().toISOString().split('T')[0];

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);

    try {
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'json') {
        content = JSON.stringify(buildJsonExportData(ideas), null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        // Export as CSV
        const headers = [
          'ID',
          'Title',
          'Description',
          'Category',
          'Status',
          'Project ID',
          'Context ID',
          'Scan Type',
          'Impact',
          'Effort',
          'Risk',
          'Created At',
          'Updated At',
        ];

        const rows = ideas.map(idea => [
          idea.id,
          escapeCSV(idea.title),
          escapeCSV(idea.description || ''),
          idea.category || '',
          idea.status,
          idea.project_id || '',
          idea.context_id || '',
          idea.scan_type || '',
          idea.impact || '',
          idea.effort || '',
          idea.risk || '',
          idea.created_at || '',
          idea.updated_at || '',
        ]);

        content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        mimeType = 'text/csv';
        extension = 'csv';
      }

      downloadFile(content, mimeType, `${filename}-${dateStamp}.${extension}`);

      setSuccess(format);
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  // Compact variant: single-click JSON export
  if (variant === 'compact') {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleExport('json')}
        disabled={ideas.length === 0 || exporting !== null}
        className={`p-2 rounded-lg transition-all duration-200 ${
          ideas.length === 0
            ? 'text-gray-500 cursor-not-allowed opacity-50'
            : 'text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 hover:shadow-md hover:shadow-amber-500/20'
        } ${className}`}
        title={`Export ${ideas.length} ideas as JSON`}
      >
        {exporting ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Download className="w-4 h-4" />
          </motion.div>
        ) : success ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </motion.button>
    );
  }

  // Full variant: dropdown with CSV/JSON options
  return (
    <div className={`relative ${className}`}>
      {/* Main button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={ideas.length === 0}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
          ${ideas.length === 0
            ? 'bg-gray-800/50 border-gray-700/50 text-gray-500 cursor-not-allowed'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
          }`}
      >
        <Download className="w-4 h-4" />
        <span className="text-sm font-medium">Export</span>
        {ideas.length > 0 && (
          <span className="text-xs text-amber-500/70">({ideas.length})</span>
        )}
      </motion.button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[160px]"
            >
              <div className="py-1">
                <ExportOption
                  icon={FileText}
                  label="Export as CSV"
                  description="Spreadsheet format"
                  onClick={() => handleExport('csv')}
                  loading={exporting === 'csv'}
                  success={success === 'csv'}
                />
                <ExportOption
                  icon={FileJson}
                  label="Export as JSON"
                  description="Developer format"
                  onClick={() => handleExport('json')}
                  loading={exporting === 'json'}
                  success={success === 'json'}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ExportOptionProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
  success?: boolean;
}

function ExportOption({
  icon: Icon,
  label,
  description,
  onClick,
  loading,
  success,
}: ExportOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all duration-200 text-left hover:pl-5 group"
    >
      <div className="mt-0.5 transition-transform duration-200 group-hover:scale-110">
        {success ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Download className="w-4 h-4 text-amber-400" />
          </motion.div>
        ) : (
          <Icon className="w-4 h-4 text-gray-400 group-hover:text-amber-400 transition-colors duration-200" />
        )}
      </div>
      <div>
        <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors duration-200">{label}</div>
        <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-200">{description}</div>
      </div>
    </button>
  );
}

/**
 * @deprecated Use ExportButton with variant="compact" instead
 */
export function ExportButtonCompact(props: Omit<ExportButtonProps, 'variant'>) {
  return <ExportButton {...props} variant="compact" />;
}
