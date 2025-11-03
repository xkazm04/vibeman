import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Save, RotateCcw, SplitSquareHorizontal, GitCompareArrows, WrapText, Eye, EyeOff, Wand2, LucideIcon } from 'lucide-react';
import MonacoEditor from './MonacoEditor';
import MonacoDiffEditor from './MonacoDiffEditor';
import FileTab from './FileTab';
import { getLanguageFromFilename, isBinaryFile } from './editorUtils';
import { loadFileContent } from './fileApi';

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  className?: string;
  title?: string;
  active?: boolean;
}

function ToolbarButton({ onClick, disabled, icon: Icon, label, className = '', title, active }: ToolbarButtonProps) {
  const baseClasses = 'px-2 py-1 rounded text-sm flex items-center gap-2 disabled:opacity-50';
  const activeClasses = active ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700';

  return (
    <button
      className={`${baseClasses} ${activeClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

interface FileContent {
  path: string;
  content: string;
  originalContent: string;
  language: string;
  loading: boolean;
  error?: string;
  dirty?: boolean;
}

interface MultiFileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  filePaths: string[];
  title?: string;
  readOnly?: boolean;
  onSave?: (filePath: string, content: string) => Promise<void>;
}

export default function MultiFileEditor({
  isOpen,
  onClose,
  filePaths,
  title = 'File Editor',
  readOnly = false,
  onSave,
}: MultiFileEditorProps) {
  const [files, setFiles] = useState<Record<string, FileContent>>({});
  const [active, setActive] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [inlineDiff, setInlineDiff] = useState(false);
  const [minimap, setMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Load on open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      const entries: Record<string, FileContent> = {};
      for (const path of filePaths) {
        try {
          const bin = await isBinaryFile(path);
          if (bin) {
            entries[path] = {
              path,
              content: '// Binary file preview is not supported.',
              originalContent: '// Binary file preview is not supported.',
              language: 'plaintext',
              loading: false,
              error: undefined,
              dirty: false,
            };
            continue;
          }
          const content = await loadFileContent(path);
          entries[path] = {
            path,
            content,
            originalContent: content,
            language: getLanguageFromFilename(path) || 'plaintext',
            loading: false,
            dirty: false,
          };
        } catch (e) {
          const error = e as Error;
          entries[path] = {
            path,
            content: '',
            originalContent: '',
            language: 'plaintext',
            loading: false,
            error: error?.message || 'Failed to load',
            dirty: false,
          };
        }
      }
      if (!cancelled) {
        setFiles(entries);
        setActive(filePaths[0] || null);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, filePaths]);

  const activeFile = active ? files[active] : undefined;
  const canCompare = !!activeFile && activeFile.originalContent !== undefined && activeFile.originalContent !== activeFile.content;

  const setFileContent = (path: string, updater: (prev: FileContent) => FileContent) => {
    setFiles(prev => ({ ...prev, [path]: updater(prev[path]) }));
  };

  const onChangeActive = useCallback((value: string) => {
    if (!active) return;
    setFileContent(active, (prev) => ({
      ...prev,
      content: value,
      dirty: value !== prev.originalContent,
    }));
  }, [active]);

  const handleSave = useCallback(async () => {
    if (!active || !onSave) return;
    const f = files[active];
    if (!f || !f.dirty) return;
    setSaving(true);
    try {
      await onSave(active, f.content);
      setFileContent(active, (p) => ({ ...p, originalContent: p.content, dirty: false }));
      setStatus('Saved');
      setTimeout(() => setStatus(''), 1200);
    } catch (e) {
      const error = e as Error;
      setStatus(error?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [active, files, onSave]);

  const handleRevert = () => {
    if (!active) return;
    setFileContent(active, (p) => ({ ...p, content: p.originalContent, dirty: false }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+S => Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+D => Toggle compare
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (canCompare) setCompare((v) => !v);
      }
      // Alt+Z => Toggle word wrap
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setWordWrap((w) => (w === 'on' ? 'off' : 'on'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave, canCompare]);

  // Editor options
  const editorOptions = useMemo(
    () => ({
      minimap: { enabled: minimap },
      wordWrap,
      readOnly,
      automaticLayout: true,
      'semanticHighlighting.enabled': true,
      scrollbar: { vertical: 'auto', horizontal: 'auto' } as const,
    }),
    [minimap, wordWrap, readOnly]
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden"
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center gap-3">
              <SplitSquareHorizontal className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm md:text-base font-semibold text-white font-mono">
                {title}{activeFile?.dirty ? ' • (unsaved)' : ''}
              </h2>
              {status && <span className="text-sm text-emerald-400">{status}</span>}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-sm">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-900 border-b border-gray-700 overflow-x-auto">
            {filePaths.map((p) => (
              <FileTab
                key={p}
                filename={p}
                isActive={p === active}
                isDirty={!!files[p]?.dirty}
                onSelect={() => setActive(p)}
                onClose={() => {
                  // soft close: move active if needed
                  if (active === p) {
                    const idx = filePaths.findIndex(fp => fp === p);
                    const next = filePaths[idx + 1] || filePaths[idx - 1] || null;
                    setActive(next);
                  }
                }}
              />
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900/50">
            <button
              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm flex items-center gap-2 disabled:opacity-50"
              onClick={handleSave} disabled={saving || !activeFile?.dirty || !onSave}
              title="Save (Ctrl+S)"
            >
              <Save className="w-4 h-4" /> Save
            </button>
            <ToolbarButton
              onClick={handleRevert}
              disabled={!activeFile?.dirty}
              icon={RotateCcw}
              label="Revert"
              title="Revert to original"
            />
            <div className="mx-2 h-5 w-px bg-gray-700" />
            <ToolbarButton
              onClick={() => canCompare && setCompare(v => !v)}
              disabled={!canCompare}
              icon={GitCompareArrows}
              label="Compare"
              title="Toggle Compare (Ctrl+D)"
              active={compare}
            />
            {compare && (
              <ToolbarButton
                onClick={() => setInlineDiff(v => !v)}
                icon={SplitSquareHorizontal}
                label={inlineDiff ? 'Inline' : 'Side-by-side'}
                title={inlineDiff ? 'Side-by-side diff' : 'Inline diff'}
                active={inlineDiff}
              />
            )}
            <div className="mx-2 h-5 w-px bg-gray-700" />
            <ToolbarButton
              onClick={() => setWordWrap(w => (w === 'on' ? 'off' : 'on'))}
              icon={WrapText}
              label={`Wrap: ${wordWrap}`}
              title="Toggle word wrap (Alt+Z)"
            />
            <ToolbarButton
              onClick={() => setMinimap(m => !m)}
              icon={minimap ? Eye : EyeOff}
              label="Minimap"
              title="Toggle minimap"
            />
            <ToolbarButton
              onClick={() => {
                setStatus('Formatting…');
                setTimeout(() => setStatus(''), 1000);
              }}
              icon={Wand2}
              label="Format"
              title="Format (Shift+Alt+F)"
              className="ml-auto"
            />
          </div>

          {/* Editor content */}
          <div className="flex-1 min-h-0">
            {!activeFile ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Select a file to start editing
              </div>
            ) : activeFile.error ? (
              <div className="p-4 text-red-400 text-sm">{activeFile.error}</div>
            ) : compare ? (
              <MonacoDiffEditor
                original={activeFile.originalContent}
                modified={activeFile.content}
                language={activeFile.language}
                theme="vs-dark"
                renderSideBySide={!inlineDiff}
                options={editorOptions}
                onChange={onChangeActive}
              />
            ) : (
              <MonacoEditor
                value={activeFile.content}
                onChange={onChangeActive}
                language={activeFile.language}
                theme="vs-dark"
                options={editorOptions}
                readOnly={readOnly}
                className="h-full"
              />
            )}
          </div>

          {/* Status bar */}
          <div className="h-7 px-3 text-sm text-gray-400 bg-gray-900/60 border-t border-gray-800 flex items-center justify-between">
            <span>{activeFile?.path || ''}</span>
            <span>{activeFile?.language} • {activeFile?.dirty ? 'Unsaved changes' : 'Clean'}</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}