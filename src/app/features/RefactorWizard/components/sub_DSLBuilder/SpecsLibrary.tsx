'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Save,
  Trash2,
  Upload,
  Download,
  ChevronRight,
  FileJson,
  Star,
  History,
} from 'lucide-react';
import { RefactorSpec } from '../../lib/dslTypes';
import { useRefactorStore } from '@/stores/refactorStore';

interface SpecsLibraryProps {
  currentSpec: RefactorSpec;
  onLoadSpec: (spec: RefactorSpec) => void;
  onSaveSpec: () => void;
}

/**
 * SpecsLibrary - Sidebar for managing saved and recent specs
 */
export default function SpecsLibrary({ currentSpec, onLoadSpec, onSaveSpec }: SpecsLibraryProps) {
  const [activeSection, setActiveSection] = useState<'saved' | 'recent'>('saved');
  const [isImporting, setIsImporting] = useState(false);

  const { savedSpecs, recentSpecs, deleteSavedSpec, addToRecentSpecs } = useRefactorStore();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      let spec: RefactorSpec;

      if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        // For YAML, we'd need a YAML parser - for now just support JSON
        throw new Error('YAML import not yet supported. Please use JSON format.');
      } else {
        spec = JSON.parse(text);
      }

      // Basic validation
      if (!spec.version || !spec.name || !spec.transformations) {
        throw new Error('Invalid spec format');
      }

      onLoadSpec(spec);
      addToRecentSpecs(spec);
    } catch (error) {
      console.error('Import failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to import spec');
    } finally {
      setIsImporting(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(currentSpec, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSpec.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-72 border-l border-white/10 bg-black/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="text-white font-medium">Specs Library</h3>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onSaveSpec}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
            data-testid="save-spec-btn"
          >
            <Save className="w-3 h-3" />
            Save
          </button>

          <label className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
            <Upload className="w-3 h-3" />
            Import
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleImport}
              className="hidden"
              data-testid="import-spec-input"
            />
          </label>

          <button
            onClick={handleExport}
            className="flex items-center justify-center px-2 py-1.5 text-xs bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
            title="Export current spec"
            data-testid="export-spec-btn"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveSection('saved')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeSection === 'saved'
              ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          data-testid="saved-specs-tab"
        >
          <Star className="w-3 h-3" />
          Saved ({savedSpecs.length})
        </button>
        <button
          onClick={() => setActiveSection('recent')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeSection === 'recent'
              ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          data-testid="recent-specs-tab"
        >
          <History className="w-3 h-3" />
          Recent ({recentSpecs.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {activeSection === 'saved' && (
            <>
              {savedSpecs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No saved specs</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Save your current spec to reuse later
                  </p>
                </div>
              ) : (
                savedSpecs.map((spec, index) => (
                  <motion.div
                    key={spec.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="group p-3 bg-white/5 rounded-lg border border-white/10 hover:border-cyan-500/30 transition-colors cursor-pointer"
                    onClick={() => onLoadSpec(spec)}
                    data-testid={`saved-spec-${index}`}
                  >
                    <div className="flex items-start gap-2">
                      <FileJson className="w-4 h-4 text-cyan-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {spec.name}
                        </p>
                        <p className="text-gray-500 text-xs truncate">
                          {spec.transformations.length} rules
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedSpec(spec.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                        data-testid={`delete-saved-spec-${index}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </>
          )}

          {activeSection === 'recent' && (
            <>
              {recentSpecs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No recent specs</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Specs you use will appear here
                  </p>
                </div>
              ) : (
                recentSpecs.map((item, index) => (
                  <motion.div
                    key={`${item.name}-${item.timestamp}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                    onClick={() => onLoadSpec(item.spec)}
                    data-testid={`recent-spec-${index}`}
                  >
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {item.name}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDate(item.timestamp)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </motion.div>
                ))
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-xs text-gray-500">
        <p className="text-center">
          Specs are stored locally in your browser
        </p>
      </div>
    </div>
  );
}
