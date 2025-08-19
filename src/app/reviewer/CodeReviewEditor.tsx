import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MonacoDiffEditor, MonacoEditor } from '@/components/editor';

interface ReviewFile {
  id: string;
  filepath: string;
  action: 'create' | 'update';
  generated_content: string;
  original_content?: string | null;
  isEditing?: boolean;
  editedContent?: string;
}

interface CodeReviewEditorProps {
  currentFile: ReviewFile | undefined;
  onContentChange: (content: string) => void;
}

// Helper function to determine language from file path
function getLanguageFromFilepath(filepath: string): string {
  const extension = filepath.split('.').pop()?.toLowerCase();

  const languageMap: { [key: string]: string } = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'md': 'markdown',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql'
  };

  return languageMap[extension || ''] || 'plaintext';
}

export default function CodeReviewEditor({ currentFile, onContentChange }: CodeReviewEditorProps) {
  if (!currentFile) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="text-gray-400">No file selected</div>
      </div>
    );
  }

  return (
    <div className="h-[70vh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentFile.id}-${currentFile.isEditing ? 'edit' : 'diff'}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {currentFile.isEditing ? (
            // Edit Mode - Monaco Editor
            <div className="h-full border border-gray-700/30 rounded-lg overflow-hidden">
              <MonacoEditor
                value={currentFile.editedContent || currentFile.generated_content}
                onChange={onContentChange}
                language={getLanguageFromFilepath(currentFile.filepath)}
                theme="vs-dark"
                height="100%"
                width="100%"
                options={{
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true
                }}
              />
            </div>
          ) : (
            // Diff Mode - Monaco Diff Editor
            <div className="h-full border border-gray-700/30 rounded-lg overflow-hidden">
              <MonacoDiffEditor
                original={currentFile.original_content || ''}
                modified={currentFile.generated_content}
                language={getLanguageFromFilepath(currentFile.filepath)}
                theme="vs-dark"
                height="100%"
                width="100%"
                options={{
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  renderSideBySide: true,
                  readOnly: true,
                  automaticLayout: true
                }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}