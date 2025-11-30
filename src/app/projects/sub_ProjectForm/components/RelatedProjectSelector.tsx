import { Link } from 'lucide-react';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

interface Project {
  id: string;
  name: string;
  port?: number;
  type?: string;
}

interface RelatedProjectSelectorProps {
  value: string;
  onChange: (value: string) => void;
  nextjsProjects: Project[];
}

export default function RelatedProjectSelector({
  value,
  onChange,
  nextjsProjects
}: RelatedProjectSelectorProps) {
  if (nextjsProjects.length === 0) {
    return null;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Related Next.js Project (Optional)
      </label>
      <div className="relative">
        <UniversalSelect
          value={value}
          onChange={(selectedValue) => onChange(selectedValue)}
          options={[
            { value: '', label: 'Select a Next.js project...' },
            ...nextjsProjects.map((project) => ({
              value: project.id,
              label: `${project.name} (:${project.port})`
            }))
          ]}
          variant="default"
          placeholder="Select a Next.js project..."
        />
        <Link className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      <div className="text-sm text-gray-500 mt-1">
        Link this FastAPI backend to a Next.js frontend
      </div>
    </div>
  );
}
