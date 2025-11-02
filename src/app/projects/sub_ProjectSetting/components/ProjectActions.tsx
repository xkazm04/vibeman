import { GitBranch, Link, ExternalLink } from 'lucide-react';
import { Project } from '@/types';
import { getProjectTypeIcon } from '../lib/projectUtils';

interface ProjectActionsProps {
  activeProject: Project;
  relatedProject: Project | null;
  connectedProjects: Project[];
}

export default function ProjectActions({
  activeProject,
  relatedProject,
  connectedProjects,
}: ProjectActionsProps) {
  const typeConfig = getProjectTypeIcon(activeProject?.type);

  return (
    <div className="flex-1 min-w-0">
      {/* Main Project Title */}
      <div className="flex items-center space-x-3 mb-1">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent tracking-tight leading-tight">
          {activeProject.name}
        </h1>
        <span className="text-lg text-gray-400 font-light">
          {typeConfig.label}
        </span>
      </div>

      {/* Project Details Row */}
      <div className="flex items-center space-x-4 flex-wrap">
        {/* Port Badge */}
        <span className="text-sm font-mono text-cyan-400/90 bg-cyan-500/15 px-3 py-1 rounded-lg border border-cyan-500/25 shadow-sm">
          :{activeProject.port}
        </span>

        {/* Git Branch */}
        {activeProject.git && (
          <div className="flex items-center space-x-1.5 bg-green-500/15 px-3 py-1 rounded-lg border border-green-500/25">
            <GitBranch className="w-3.5 h-3.5 text-green-400" />
            <span className="text-sm text-green-400/90 font-mono">
              {activeProject.git.branch}
            </span>
          </div>
        )}

        {/* Related Project Connection */}
        {relatedProject && (
          <div className="flex items-center space-x-1.5 bg-blue-500/15 px-3 py-1 rounded-lg border border-blue-500/25">
            <Link className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-sm text-blue-400/90 font-medium">
              → {relatedProject.name}
            </span>
          </div>
        )}

        {/* Connected Projects */}
        {connectedProjects.length > 0 && !relatedProject && (
          <div className="flex items-center space-x-1.5 bg-blue-500/15 px-3 py-1 rounded-lg border border-blue-500/25">
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-sm text-blue-400/90 font-medium">
              {connectedProjects.length} connected
            </span>
          </div>
        )}

        {/* Run Script Hint */}
        {activeProject.runScript && (
          <div className="hidden lg:flex items-center space-x-1.5 bg-gray-500/15 px-3 py-1 rounded-lg border border-gray-500/25">
            <span className="text-sm text-gray-400 font-mono truncate max-w-32">
              {activeProject.runScript}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}