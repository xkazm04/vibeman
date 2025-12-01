'use client';

import { useState } from 'react';
import ContextPreviewHeader from './components/ContextPreviewHeader';
import ContextPreviewActions from './components/ContextPreviewActions';
import ImagePathInput from './ImagePathInput';
import PreviewDisplay from './components/PreviewDisplay';
import ErrorDisplay from '@/app/features/Context/components/ErrorDisplay';

interface ContextPreviewManagerProps {
  contextId: string;
  currentPreview: string | null;
  currentTestScenario: string | null;
  currentTarget?: string | null;
  currentTargetFulfillment?: string | null;
  contextName: string;
  groupColor: string;
  onPreviewUpdated: (newPreview: string | null, testScenario: string | null, target?: string | null, targetFulfillment?: string | null) => void;
}

// Maximum character limits for text fields
const MAX_TARGET_LENGTH = 2000;
const MAX_FULFILLMENT_LENGTH = 2000;
const MAX_PATH_LENGTH = 500;

// Validate image path format
function validateImagePath(path: string): { valid: boolean; error?: string } {
  if (!path || path.trim() === '') {
    return { valid: true }; // Empty is valid (optional)
  }

  const trimmedPath = path.trim();

  if (trimmedPath.length > MAX_PATH_LENGTH) {
    return { valid: false, error: `Path too long (max ${MAX_PATH_LENGTH} characters)` };
  }

  // Check for potentially dangerous characters
  if (/[<>"|?*]/.test(trimmedPath)) {
    return { valid: false, error: 'Path contains invalid characters' };
  }

  // Check for directory traversal attempts
  if (trimmedPath.includes('..')) {
    return { valid: false, error: 'Path cannot contain ".."' };
  }

  // Validate extension (only common image formats)
  const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const hasValidExtension = validExtensions.some(ext =>
    trimmedPath.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension && trimmedPath.length > 0) {
    return { valid: false, error: 'Path must end with a valid image extension (.png, .jpg, .jpeg, .gif, .webp, .svg)' };
  }

  return { valid: true };
}

export default function ContextPreviewManager({
  contextId,
  currentPreview,
  currentTestScenario,
  currentTarget,
  currentTargetFulfillment,
  contextName,
  groupColor,
  onPreviewUpdated,
}: ContextPreviewManagerProps) {
  const [previewPath, setPreviewPath] = useState(currentPreview || '');
  const [testScenario, setTestScenario] = useState(currentTestScenario || '');
  const [target, setTarget] = useState(currentTarget || '');
  const [targetFulfillment, setTargetFulfillment] = useState(currentTargetFulfillment || '');
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pathValidationError, setPathValidationError] = useState<string | null>(null);

  const handlePathChange = (newPath: string) => {
    setPreviewPath(newPath);
    setImageError(false);

    // Validate on change
    const validation = validateImagePath(newPath);
    setPathValidationError(validation.valid ? null : validation.error || null);
  };

  const handleSave = async () => {
    setSaveError(null);

    // Validate all inputs before saving
    const pathValidation = validateImagePath(previewPath);
    if (!pathValidation.valid) {
      setSaveError(pathValidation.error || 'Invalid image path');
      return;
    }

    if (target.length > MAX_TARGET_LENGTH) {
      setSaveError(`Target text exceeds maximum length of ${MAX_TARGET_LENGTH} characters`);
      return;
    }

    if (targetFulfillment.length > MAX_FULFILLMENT_LENGTH) {
      setSaveError(`Target fulfillment text exceeds maximum length of ${MAX_FULFILLMENT_LENGTH} characters`);
      return;
    }

    setIsSaving(true);

    try {
      onPreviewUpdated(
        previewPath.trim() || null,
        testScenario.trim() || null,
        target.trim() || null,
        targetFulfillment.trim() || null
      );
    } catch (err) {
      console.error('[ContextPreviewManager] Save error:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save preview');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = (preview: string | null, testScenario: string | null) => {
    setPreviewPath('');
    setTestScenario('');
    setPathValidationError(null);
    onPreviewUpdated(preview, testScenario);
  };

  const handleActionError = (error: string) => {
    setSaveError(error);
  };

  const hasChanges =
    previewPath !== (currentPreview || '') ||
    testScenario !== (currentTestScenario || '') ||
    target !== (currentTarget || '') ||
    targetFulfillment !== (currentTargetFulfillment || '');

  const hasValidationErrors = !!pathValidationError;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30 space-y-3" data-testid="context-preview-manager">
      <ContextPreviewHeader
        contextId={contextId}
        groupColor={groupColor}
        currentPreview={currentPreview}
        isSaving={isSaving}
        onPreviewUpdated={handleRemove}
      />

      <div className="space-y-3">
        {/* Save Error Display */}
        {saveError && (
          <ErrorDisplay
            error={saveError}
            severity="error"
            context="Save Error"
            onDismiss={() => setSaveError(null)}
            compact
          />
        )}

        <ImagePathInput
          value={previewPath}
          onChange={handlePathChange}
          onImageError={() => setImageError(false)}
        />

        {/* Path Validation Error */}
        {pathValidationError && (
          <p className="text-xs text-amber-400 font-mono" data-testid="path-validation-error">
            {pathValidationError}
          </p>
        )}

        <PreviewDisplay
          previewPath={previewPath}
          contextName={contextName}
          imageError={imageError}
          onError={() => setImageError(true)}
        />

        {/* Target Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
              Target / Goal
            </label>
            <span className={`text-xs font-mono ${target.length > MAX_TARGET_LENGTH ? 'text-red-400' : 'text-gray-500'}`}>
              {target.length}/{MAX_TARGET_LENGTH}
            </span>
          </div>
          <textarea
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Describe the target functionality or goal of this context..."
            className={`w-full px-3 py-2 bg-gray-900/50 border rounded-lg text-sm text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:ring-1 transition-all resize-y min-h-[60px] ${
              target.length > MAX_TARGET_LENGTH
                ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30'
                : 'border-gray-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/30'
            }`}
            data-testid="context-target-input"
          />
          {target.length > MAX_TARGET_LENGTH && (
            <p className="text-xs text-red-400 font-mono">
              Target exceeds maximum length by {target.length - MAX_TARGET_LENGTH} characters
            </p>
          )}
        </div>

        {/* Target Fulfillment Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
              Target Fulfillment / Progress
            </label>
            <span className={`text-xs font-mono ${targetFulfillment.length > MAX_FULFILLMENT_LENGTH ? 'text-red-400' : 'text-gray-500'}`}>
              {targetFulfillment.length}/{MAX_FULFILLMENT_LENGTH}
            </span>
          </div>
          <textarea
            value={targetFulfillment}
            onChange={(e) => setTargetFulfillment(e.target.value)}
            placeholder="Describe the current progress toward the target..."
            className={`w-full px-3 py-2 bg-gray-900/50 border rounded-lg text-sm text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:ring-1 transition-all resize-y min-h-[60px] ${
              targetFulfillment.length > MAX_FULFILLMENT_LENGTH
                ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30'
                : 'border-gray-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/30'
            }`}
            data-testid="context-target-fulfillment-input"
          />
          {targetFulfillment.length > MAX_FULFILLMENT_LENGTH && (
            <p className="text-xs text-red-400 font-mono">
              Fulfillment text exceeds maximum length by {targetFulfillment.length - MAX_FULFILLMENT_LENGTH} characters
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <ContextPreviewActions
          contextId={contextId}
          currentPreview={currentPreview}
          currentTestScenario={currentTestScenario}
          previewPath={previewPath}
          testScenario={testScenario}
          isSaving={isSaving}
          hasChanges={hasChanges && !hasValidationErrors}
          onSave={handleSave}
          onError={handleActionError}
        />
      </div>
    </div>
  );
}
