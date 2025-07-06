import { Goal } from '../../../types';

interface GoalsDetailDescriptionProps {
  goal: Goal;
  editedGoal: Goal;
  isEditing: boolean;
  onFieldChange: (field: keyof Goal, value: string | number) => void;
}

export default function GoalsDetailDescription({
  goal,
  editedGoal,
  isEditing,
  onFieldChange
}: GoalsDetailDescriptionProps) {
  return (
    <div className="space-y-6">
      {/* Description Section */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Description</h3>
        {isEditing ? (
          <textarea
            value={editedGoal.description || ''}
            onChange={(e) => onFieldChange('description', e.target.value)}
            rows={6}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
            placeholder="Enter goal description..."
          />
        ) : (
          <p className="text-slate-200 leading-relaxed px-4 py-3 bg-slate-800/30 rounded-lg border border-slate-700/30 min-h-[6rem]">
            {editedGoal.description || 'No description provided'}
          </p>
        )}
      </div>
    </div>
  );
} 