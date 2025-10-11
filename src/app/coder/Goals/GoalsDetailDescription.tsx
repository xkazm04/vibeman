import { Goal } from '../../../types';

interface GoalsDetailDescriptionProps {
  goal: Goal;
  editedGoal: Goal;
  isEditing: boolean;
  onFieldChange: (field: keyof Goal, value: string | number) => void;
}

export default function GoalsDetailDescription({
  editedGoal,
  isEditing,
  onFieldChange
}: GoalsDetailDescriptionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white/90 mb-4 tracking-wide uppercase">
        Description
      </h3>
      {isEditing ? (
        <textarea
          value={editedGoal.description || ''}
          onChange={(e) => onFieldChange('description', e.target.value)}
          rows={10}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none text-sm"
          placeholder="Enter goal description..."
        />
      ) : (
        <div className="min-h-[240px] p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
          <p className="text-slate-200 leading-relaxed text-sm whitespace-pre-wrap">
            {editedGoal.description || (
              <span className="text-slate-500 italic">No description provided</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
} 