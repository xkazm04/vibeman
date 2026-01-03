import { Check } from 'lucide-react';
import { PROJECT_TYPES } from '../config';
import { ProjectType } from '../types';

interface ProjectTypeSelectorProps {
  selectedType: ProjectType;
  onTypeSelect: (type: ProjectType) => void;
  isEdit?: boolean;
}

export default function ProjectTypeSelector({
  selectedType,
  onTypeSelect,
  isEdit = false
}: ProjectTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400">
        Type *
      </label>
      <div className="grid grid-cols-4 gap-2">
        {PROJECT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onTypeSelect(type.value)}
              className={`relative flex flex-col items-center p-2.5 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-500/40 ring-1 ring-cyan-500/30'
                  : 'bg-gray-700/30 border-gray-700/50 hover:border-gray-600/60 hover:bg-gray-700/50'
              }`}
            >
              {isSelected && (
                <div className="absolute top-1 right-1">
                  <Check className="w-3 h-3 text-cyan-400" />
                </div>
              )}
              <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-cyan-400' : type.color}`} />
              <span className={`text-xs font-medium ${isSelected ? 'text-cyan-300' : 'text-gray-400'}`}>
                {type.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
