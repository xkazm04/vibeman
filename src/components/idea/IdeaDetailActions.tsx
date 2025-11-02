import { motion } from 'framer-motion';
import { Check, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { DbIdea } from '@/app/db';

interface IdeaDetailActionsProps {
  idea: DbIdea;
  saving: boolean;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSaveFeedback: () => Promise<void>;
  onRegenerate: () => Promise<void>;
}

export default function IdeaDetailActions({
  idea,
  saving,
  onAccept,
  onReject,
  onDelete,
  onSaveFeedback,
  onRegenerate,
}: IdeaDetailActionsProps) {

  const handleReject = async () => {
    // Delete requirement file if it exists
    if (idea.requirement_id) {
      try {
        // Find the project to get the path
        const projectsResponse = await fetch('/api/projects');
        const projectsData = await projectsResponse.json();
        const project = projectsData.find((p: any) => p.id === idea.project_id);

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
          console.log('[IdeaDetailActions] Deleted requirement file:', idea.requirement_id);
        }
      } catch (error) {
        console.error('[IdeaDetailActions] Failed to delete requirement file:', error);
        // Don't block rejection if file deletion fails
      }
    }

    await onReject();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-800/50">
      {/* Left: Delete and Reject (grouped) */}
      <div className="flex items-center gap-2">
        {/* Delete Button */}
          <motion.button
            onClick={onDelete}
            data-testid="idea-detail-delete-button"
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium transition-all disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </motion.button>

        {/* Reject Button */}
        {idea.status !== 'rejected'  && (
          <motion.button
            onClick={handleReject}
            data-testid="idea-detail-reject-button"
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 rounded-lg text-orange-300 text-xs font-medium transition-all disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject</span>
          </motion.button>
        )}
      </div>

      {/* Right: Accept, Regenerate, and Save (grouped) */}
      <div className="flex items-center gap-2">
        {/* Accept Button */}
        {idea.status !== 'accepted' && (
          <motion.button
            onClick={onAccept}
            data-testid="idea-detail-accept-button"
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 text-xs font-medium transition-all disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept</span>
          </motion.button>
        )}

        {/* Regenerate Button - Only visible for accepted ideas */}
        {idea.status === 'accepted' && (
          <motion.button
            onClick={onRegenerate}
            data-testid="idea-detail-regenerate-button"
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-300 text-xs font-medium transition-all disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </motion.button>
        )}

        {/* Save Feedback Button */}
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
