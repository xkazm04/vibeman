import { Link2 } from 'lucide-react';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

interface Project {
  id: string;
  name: string;
  port?: number | null;
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
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
        <Link2 className="w-3 h-3" />
        Link to Next.js Frontend
      </label>
      <UniversalSelect
        value={value}
        onChange={(selectedValue) => onChange(selectedValue)}
        options={[
          { value: '', label: 'None' },
          ...nextjsProjects.map((project) => ({
            value: project.id,
            label: `${project.name} (:${project.port})`
          }))
        ]}
        variant="default"
        placeholder="Select project..."
      />
    </div>
  );
}
