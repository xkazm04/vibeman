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
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-3">
        Project Type *
      </label>
      <div className="grid grid-cols-3 gap-3">
        {PROJECT_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <label
              key={type.value}
              className={`relative flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-all ${
                selectedType === type.value
                  ? 'bg-cyan-500/20 border-cyan-500/40 shadow-lg'
                  : 'bg-gray-700/30 border-gray-600/40 hover:border-gray-500/60'
              }`}
            >
              <input
                type="radio"
                name="projectType"
                value={type.value}
                checked={selectedType === type.value}
                onChange={(e) => {
                  const newType = e.target.value as ProjectType;
                  onTypeSelect(newType);
                }}
                className="sr-only"
              />
              <Icon className={`w-6 h-6 mb-2 ${selectedType === type.value ? 'text-cyan-400' : type.color}`} />
              <span className={`text-sm font-medium ${selectedType === type.value ? 'text-cyan-300' : 'text-gray-300'}`}>
                {type.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
