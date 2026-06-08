import { motion } from 'framer-motion';
import { Check, XCircle, Trash2, RefreshCw, Layers, Save, LucideIcon } from 'lucide-react';
import type { DbIdea } from '@/app/db/models/types';

interface Project {
  id: string;
  name: string;
  path: string;
}

interface IdeaDetailActionsProps {
  idea: DbIdea;
  saving: boolean;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSaveFeedback: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onShowVariants?: () => void;
}

interface ActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  className: string;
  testId: string;
}

function ActionButton({ onClick, disabled, icon: Icon, label, className, testId }: ActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      data-testid={testId}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </motion.button>
  );
}

export default function IdeaDetailActions({
  idea,
  saving,
  onAccept,
  onReject,
  onDelete,
  onSaveFeedback,
  onRegenerate,
  onShowVariants,
}: IdeaDetailActionsProps) {

  const handleReject = async () => {
    // Delete requirement file if it exists
    if (idea.requirement_id) {
      try {
        // Find the project to get the path
        const projectsResponse = await fetch('/api/projects');
        const projectsData: Project[] = await projectsResponse.json();
        const project = projectsData.find((p) => p.id === idea.project_id);

        if (project?.path) {
          // Delete the requirement file
          await fetch('/api/claude-code/requirement', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
              requirementName: idea.requirement_id,
            }),
          });
        }
      } catch (error) {
        // Don't block rejection if file deletion fails
        // Error is logged by the API endpoint
      }
    }

    await onReject();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-800/50">
      {/* Left: Destructive actions */}
      <div className="flex items-center gap-2">
        <ActionButton
          onClick={onDelete}
          disabled={saving}
          icon={Trash2}
          label="Delete"
          className="bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10"
          testId="idea-detail-delete-button"
        />

        {idea.status !== 'rejected' && (
          <ActionButton
            onClick={handleReject}
            disabled={saving}
            icon={XCircle}
            label="Reject"
            className="bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10"
            testId="idea-detail-reject-button"
          />
        )}
      </div>

      {/* Divider between destructive and constructive groups */}
      <div className="border-r border-zinc-700 h-6 mx-1" />

      {/* Right: Secondary + Primary actions */}
      <div className="flex items-center gap-2">
        {idea.status === 'pending' && onShowVariants && (
          <ActionButton
            onClick={onShowVariants}
            disabled={saving}
            icon={Layers}
            label="Variants"
            className="bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 text-zinc-200"
            testId="idea-detail-variants-button"
          />
        )}

        {idea.status === 'accepted' && (
          <ActionButton
            onClick={onRegenerate}
            disabled={saving}
            icon={RefreshCw}
            label="Regenerate"
            className="bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 text-zinc-200"
            testId="idea-detail-regenerate-button"
          />
        )}

        {idea.status !== 'accepted' && (
          <ActionButton
            onClick={onAccept}
            disabled={saving}
            icon={Check}
            label="Accept"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20"
            testId="idea-detail-accept-button"
          />
        )}

        <ActionButton
          onClick={onSaveFeedback}
          disabled={saving}
          icon={Save}
          label={saving ? 'Saving...' : 'Save'}
          className="bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 text-zinc-200"
          testId="idea-detail-save-feedback-button"
        />
      </div>
    </div>
  );
}
