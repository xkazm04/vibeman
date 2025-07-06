import React from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2 } from 'lucide-react';
import { Project } from '@/types';

interface Props {
  project: Project;
  projectData: Project | undefined;
  projectHasChanges: boolean;
  onToggleExpanded: () => void;
  onSave: () => void;
  onDelete: () => void;
}

const RunnerSettingHeader = React.memo<Props>(({
  project,
  projectData,
  projectHasChanges,
  onToggleExpanded,
  onSave,
  onDelete
}: Props) => {


  return (
    <div 
      className="relative p-4 cursor-pointer hover:bg-gradient-to-r hover:from-slate-700/30 hover:to-slate-600/30 transition-all duration-200"
      onClick={onToggleExpanded}
    >
      {/* Header Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-500 to-slate-600 shadow-sm"></div>
          <h3 className="text-lg font-medium bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
            {projectData?.name || project.name}
          </h3>
          <span className="text-xs text-slate-400 bg-gradient-to-r from-slate-700/60 to-slate-600/60 px-2 py-1 rounded-lg border border-slate-600/30">
            :{projectData?.port || project.port}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Manual Save Button (only show when there are changes) */}
          {projectHasChanges && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200 border border-transparent hover:border-green-400/30"
              title="Save Changes"
            >
              <Save className="w-4 h-4" />
            </motion.button>
          )}

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 border border-transparent hover:border-red-400/30"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

RunnerSettingHeader.displayName = 'RunnerSettingHeader';

export default RunnerSettingHeader; 