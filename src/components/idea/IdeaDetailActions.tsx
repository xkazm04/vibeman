import { motion } from 'framer-motion';
import { Check, XCircle, Trash2, RefreshCw, Layers, LucideIcon } from 'lucide-react';
import { DbIdea } from '@/app/db';

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
      {/* Left: Delete and Reject (grouped) */}
      <div className="flex items-center gap-2">
        <ActionButton
          onClick={onDelete}
          disabled={saving}
          icon={Trash2}
          label="Delete"
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400"
          testId="idea-detail-delete-button"
        />

        {idea.status !== 'rejected' && (
          <ActionButton
            onClick={handleReject}
            disabled={saving}
            icon={XCircle}
            label="Reject"
            className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300"
            testId="idea-detail-reject-button"
          />
        )}
      </div>

      {/* Right: Variants, Accept, Regenerate, and Save (grouped) */}
      <div className="flex items-center gap-2">
        {idea.status === 'pending' && onShowVariants && (
          <ActionButton
            onClick={onShowVariants}
            disabled={saving}
            icon={Layers}
            label="Variants"
            className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300"
            testId="idea-detail-variants-button"
          />
        )}

        {idea.status !== 'accepted' && (
          <ActionButton
            onClick={onAccept}
            disabled={saving}
            icon={Check}
            label="Accept"
            className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300"
            testId="idea-detail-accept-button"
          />
        )}

        {idea.status === 'accepted' && (
          <ActionButton
            onClick={onRegenerate}
            disabled={saving}
            icon={RefreshCw}
            label="Regenerate"
            className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300"
            testId="idea-detail-regenerate-button"
          />
        )}

        <motion.button
          onClick={onSaveFeedback}
          data-testid="idea-detail-save-feedback-button"
          disabled={saving}
          className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {saving ? 'Saving...' : 'Save Feedback'}
        </motion.button>
      </div>
    </div>
  );
}
