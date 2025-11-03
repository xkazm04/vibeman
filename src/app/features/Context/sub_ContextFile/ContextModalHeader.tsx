import React from 'react';
import { X, FileText, Edit3, Save, Eye } from 'lucide-react';
import { Context } from '../../../../stores/contextStore';

interface ContextModalHeaderProps {
  context: Context;
  hasContextFile: boolean;
  isEditing: boolean;
  previewMode: 'edit' | 'preview';
  saving: boolean;
  onPreviewModeChange: (mode: 'edit' | 'preview') => void;
  onSave: () => void;
  onClose: () => void;
}

interface ModeButtonProps {
  mode: 'edit' | 'preview';
  currentMode: 'edit' | 'preview';
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ModeButton({ mode, currentMode, onClick, icon, label }: ModeButtonProps) {
  const isActive = currentMode === mode;
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded-md transition-colors ${
        isActive
          ? 'bg-gray-700 text-white'
          : 'text-gray-400 hover:text-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function HeaderTitle({ context }: { context: Context }) {
  return (
    <div className="flex items-center space-x-3">
      <FileText className="w-5 h-5 text-cyan-400" />
      <div>
        <h2 className="text-lg font-semibold text-white font-mono">
          Context File: {context.name}
        </h2>
        <p className="text-sm text-gray-400">
          Business description and documentation
        </p>
      </div>
    </div>
  );
}

function ModeToggle({
  previewMode,
  onPreviewModeChange
}: {
  previewMode: 'edit' | 'preview';
  onPreviewModeChange: (mode: 'edit' | 'preview') => void;
}) {
  return (
    <div className="flex items-center bg-gray-800 rounded-lg p-1">
      <ModeButton
        mode="preview"
        currentMode={previewMode}
        onClick={() => onPreviewModeChange('preview')}
        icon={<Eye className="w-3 h-3 inline mr-1" />}
        label="Preview"
      />
      <ModeButton
        mode="edit"
        currentMode={previewMode}
        onClick={() => onPreviewModeChange('edit')}
        icon={<Edit3 className="w-3 h-3 inline mr-1" />}
        label="Edit"
      />
    </div>
  );
}

export default function ContextModalHeader({
  context,
  hasContextFile,
  isEditing,
  previewMode,
  saving,
  onPreviewModeChange,
  onSave,
  onClose
}: ContextModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
      <HeaderTitle context={context} />

      <div className="flex items-center space-x-2">
        {(hasContextFile || isEditing) && (
          <ModeToggle previewMode={previewMode} onPreviewModeChange={onPreviewModeChange} />
        )}

        {previewMode === 'edit' && (
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center space-x-2 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-md hover:bg-cyan-500/30 transition-colors disabled:opacity-50 text-sm font-mono"
          >
            <Save className="w-3 h-3" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded-sm transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}