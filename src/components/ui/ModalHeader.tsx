import React from 'react';
import { X, Edit3, Save, Eye } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

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
  /** ID for the title element (used for aria-labelledby) */
  titleId?: string;
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
  onClose,
  titleId,
}: ModalHeaderProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <h2
            id={titleId}
            className="text-lg font-semibold text-white font-mono"
          >
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
            className={`flex items-center space-x-2 px-3 py-1.5 ${colors.bg} ${colors.text} rounded-md hover:${colors.bgHover} transition-colors disabled:opacity-50 text-sm font-mono`}
          >
            <Save className="w-3 h-3" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded-sm transition-colors"
          aria-label="Close modal"
          data-testid="modal-header-close-btn"
        >
          <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}