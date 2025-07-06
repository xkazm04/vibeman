'use client';
import React from 'react';
import { Calendar } from 'lucide-react';
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

      {/* Details Section */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Details</h3>
        <div className="space-y-4">
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <h4 className="text-sm font-medium text-slate-300 mb-1">Order</h4>
            <p className="text-sm text-slate-400">#{editedGoal.order}</p>
          </div>
          
          {goal.created_at && (
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <h4 className="text-sm font-medium text-slate-300 mb-1">Created</h4>
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className="text-sm text-slate-400">
                  {new Date(goal.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          
          {goal.updated_at && goal.updated_at !== goal.created_at && (
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <h4 className="text-sm font-medium text-slate-300 mb-1">Last Updated</h4>
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className="text-sm text-slate-400">
                  {new Date(goal.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 