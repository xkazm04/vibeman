import React from 'react';
import { ArrowLeft, Save } from 'lucide-react';

interface ContextHeaderProps {
  contextCount: number;
  totalFiles: number;
  selectedCount: number;
  selectedFiles: Set<string>;
  transferMode: boolean;
  saving: boolean;
  onBack: () => void;
  onSelectAll: () => void;
  onToggleTransferMode: () => void;
  onSave: () => void;
}

export default function ContextHeader({
  contextCount,
  totalFiles,
  selectedCount,
  selectedFiles,
  transferMode,
  saving,
  onBack,
  onSelectAll,
  onToggleTransferMode,
  onSave
}: ContextHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-700/30">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-white">Context Scanner</h2>
          <p className="text-gray-400">
            Review and organize {contextCount} contexts with {totalFiles} files
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center space-x-4">
        {selectedFiles.size > 0 && (
          <div className="flex items-center space-x-3 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <span className="text-blue-400 font-medium">
              {selectedFiles.size} files selected
            </span>
            <button
              onClick={onToggleTransferMode}
              className={`flex items-center space-x-2 px-3 py-1 rounded transition-colors ${
                transferMode
                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
              }`}
            >
              <span>{transferMode ? 'Cancel Move' : 'Move Files'}</span>
            </button>
          </div>
        )}

        <div className="flex items-center space-x-3">
          <button
            onClick={onSelectAll}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {selectedCount === contextCount ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-gray-400">
            {selectedCount} of {contextCount} selected
          </span>

          <button
            onClick={onSave}
            disabled={selectedCount === 0 || saving}
            className="flex items-center space-x-2 px-6 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Selected</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}