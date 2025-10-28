import React from 'react';
import { X, Edit3, Save, Eye } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showModeToggle?: boolean;
  previewMode?: 'edit' | 'preview';
  showSaveButton?: boolean;
  saving?: boolean;
  onPreviewModeChange?: (mode: 'edit' | 'preview') => void;
  onSave?: () => void;
  onClose: () => void;
}

export default function ModalHeader({
  title,
  subtitle,
  icon,
  showModeToggle = false,
  previewMode = 'preview',
  showSaveButton = false,
  saving = false,
  onPreviewModeChange,
  onSave,
  onClose
}: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <h2 className="text-lg font-semibold text-white font-mono">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Mode Toggle */}
        {showModeToggle && onPreviewModeChange && (
          <div className="flex items-center bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => onPreviewModeChange('preview')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                previewMode === 'preview'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Eye className="w-3 h-3 inline mr-1" />
              Preview
            </button>
            <button
              onClick={() => onPreviewModeChange('edit')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                previewMode === 'edit'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Edit3 className="w-3 h-3 inline mr-1" />
              Edit
            </button>
          </div>
        )}

        {/* Save Button */}
        {showSaveButton && onSave && previewMode === 'edit' && (
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