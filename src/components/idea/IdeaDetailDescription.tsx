'use client';
import { motion } from 'framer-motion';
import { Edit2, Save } from 'lucide-react';

interface IdeaDetailDescriptionProps {
  description: string;
  isEditing: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
}

interface EditActionsProps {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function EditActions({ onSave, onCancel, saving }: EditActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <motion.button
        data-testid="idea-description-save-button"
        onClick={onSave}
        disabled={saving}
        className="p-1.5 hover:bg-green-500/20 rounded transition-colors disabled:opacity-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Save description"
      >
        <Save className="w-3.5 h-3.5 text-green-400" />
      </motion.button>
      <button
        onClick={onCancel}
        data-testid="idea-description-cancel-button"
        className="text-xs text-gray-400 hover:text-white transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

interface DescriptionHeaderProps {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function DescriptionHeader({ isEditing, onEdit, onSave, onCancel, saving }: DescriptionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Description
      </h3>
      {!isEditing ? (
        <motion.button
          onClick={onEdit}
          data-testid="idea-description-edit-button"
          className="p-1.5 hover:bg-gray-700/40 rounded transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Edit description"
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-400" />
        </motion.button>
      ) : (
        <EditActions onSave={onSave} onCancel={onCancel} saving={saving} />
      )}
    </div>
  );
}

export default function IdeaDetailDescription({
  description,
  isEditing,
  saving,
  onEdit,
  onSave,
  onCancel,
  onChange,
}: IdeaDetailDescriptionProps) {
  return (
    <div>
      <DescriptionHeader
        isEditing={isEditing}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
      {!isEditing ? (
        <p className="text-sm text-white leading-relaxed">
          {description || 'No description provided'}
        </p>
      ) : (
        <textarea
          data-testid="idea-description-textarea"
          value={description}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter description..."
          className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all resize-none"
          rows={4}
          autoFocus
        />
      )}
    </div>
  );
}
