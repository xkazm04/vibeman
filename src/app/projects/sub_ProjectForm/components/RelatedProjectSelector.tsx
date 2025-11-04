import { Link } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  port: number;
  type: string;
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
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all appearance-none"
        >
          <option value="">Select a Next.js project...</option>
          {nextjsProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} (:{project.port})
            </option>
          ))}
        </select>
        <Link className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      <div className="text-sm text-gray-500 mt-1">
        Link this FastAPI backend to a Next.js frontend
      </div>
    </div>
  );
}
