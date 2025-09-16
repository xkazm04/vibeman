import React, { useState, useEffect } from 'react';
import { FolderOpen, AlertCircle, Loader2, Code, Server, Link } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useProjectConfigStore } from '../../../stores/projectConfigStore';

interface Directory {
  name: string;
  path: string;
}

interface DirectoriesResponse {
  success: boolean;
  currentAppPath: string;
  parentPath: string;
  directories: Directory[];
  error?: string;
}

interface ProjectFormData {
  id?: string;
  name: string;
  path: string;
  port: number;
  description?: string;
  type: 'nextjs' | 'fastapi' | 'other';
  relatedProjectId?: string;
  git_repository?: string;
  git_branch?: string;
  run_script?: string;
}

interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  loading: boolean;
  error: string;
  isEdit?: boolean;
}

const PROJECT_TYPES = [
  { 
    value: 'nextjs', 
    label: 'Next.js', 
    icon: Code, 
    color: 'text-blue-400',
    defaultScript: 'npm run dev',
    defaultPort: 3000
  },
  { 
    value: 'fastapi', 
    label: 'FastAPI', 
    icon: Server, 
    color: 'text-green-400',
    defaultScript: 'uvicorn main:app --reload',
    defaultPort: 8000
  },
  { 
    value: 'other', 
    label: 'Other', 
    icon: FolderOpen, 
    color: 'text-gray-400',
    defaultScript: 'npm start',
    defaultPort: 3000
  }
];

export default function ProjectForm({ 
  initialData, 
  onSubmit, 
  loading, 
  error,
  isEdit = false 
}: ProjectFormProps) {
  const { projects } = useProjectConfigStore();
  const [loadingDirectories, setLoadingDirectories] = useState(false);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [parentPath, setParentPath] = useState('');
  
  // Form state
  const [selectedPath, setSelectedPath] = useState(initialData?.path || '');
  const [projectName, setProjectName] = useState(initialData?.name || '');
  const [port, setPort] = useState(initialData?.port || 3000);
  const [description, setDescription] = useState(initialData?.description || '');
  const [projectType, setProjectType] = useState<'nextjs' | 'fastapi' | 'other'>(initialData?.type || 'nextjs');
  const [relatedProjectId, setRelatedProjectId] = useState(initialData?.relatedProjectId || '');
  const [gitRepository, setGitRepository] = useState(initialData?.git_repository || '');
  const [gitBranch, setGitBranch] = useState(initialData?.git_branch || 'main');
  const [runScript, setRunScript] = useState(initialData?.run_script || 'npm run dev');

  // Get NextJS projects for FastAPI relation
  const nextjsProjects = projects.filter(p => p.type === 'nextjs');

  // Load available directories when component mounts (only for new projects)
  useEffect(() => {
    if (!isEdit) {
      loadDirectories();
    }
  }, [isEdit]);

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setSelectedPath(initialData.path || '');
      setProjectName(initialData.name || '');
      setPort(initialData.port || 3000);
      setDescription(initialData.description || '');
      setProjectType(initialData.type || 'nextjs');
      setRelatedProjectId(initialData.relatedProjectId || '');
      setGitRepository(initialData.git_repository || '');
      setGitBranch(initialData.git_branch || 'main');
      setRunScript(initialData.run_script || 'npm run dev');
    }
  }, [initialData]);

  // Update defaults when project type changes
  useEffect(() => {
    const typeConfig = PROJECT_TYPES.find(t => t.value === projectType);
    if (typeConfig && !isEdit) {
      setRunScript(typeConfig.defaultScript);
      if (!initialData) { // Only set port if not editing and no initial data
        setPort(typeConfig.defaultPort);
      }
    }
  }, [projectType, isEdit, initialData]);

  const loadDirectories = async () => {
    setLoadingDirectories(true);
    try {
      const response = await fetch('/api/projects/directories');
      const data: DirectoriesResponse = await response.json();
      
      if (data.success) {
        setDirectories(data.directories);
        setParentPath(data.parentPath);
      }
    } catch (error) {
      console.error('Error loading directories:', error);
    } finally {
      setLoadingDirectories(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPath) {
      return;
    }
    
    if (!projectName.trim()) {
      return;
    }
    
    if (port < 1000 || port > 65535) {
      return;
    }

    const projectData: ProjectFormData = {
      id: initialData?.id || uuidv4(),
      name: projectName.trim(),
      path: selectedPath,
      port: port,
      description: description.trim() || undefined,
      type: projectType,
      relatedProjectId: projectType === 'fastapi' && relatedProjectId ? relatedProjectId : undefined,
      git_repository: gitRepository.trim() || undefined,
      git_branch: gitBranch.trim() || 'main',
      run_script: runScript.trim() || 'npm run dev'
    };

    await onSubmit(projectData);
  };

  return (
    <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
      
      {/* Path Selection - Only show for new projects */}
      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Project Path *
          </label>
          
          {loadingDirectories ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="ml-2 text-gray-400">Loading directories...</span>
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500 mb-3">
                Parent directory: <span className="font-mono text-gray-400">{parentPath}</span>
              </div>
              
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar border border-gray-600 rounded-md p-3 bg-gray-700/30">
                {directories.map((dir) => (
                  <label
                    key={dir.path}
                    className={`flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-colors ${
                      selectedPath === dir.path
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'hover:bg-gray-600/30 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="projectPath"
                      value={dir.path}
                      checked={selectedPath === dir.path}
                      onChange={(e) => {
                        setSelectedPath(e.target.value);
                        // Auto-fill project name if empty
                        if (!projectName) {
                          setProjectName(dir.name);
                        }
                      }}
                      className="sr-only"
                    />
                    <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {dir.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate font-mono">
                        {dir.path}
                      </div>
                    </div>
                  </label>
                ))}
                
                {directories.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No directories found in parent path
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Path Display for Edit Mode */}
      {isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Project Path
          </label>
          <div className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-300 text-sm font-mono">
            {selectedPath}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Path cannot be changed after project creation
          </div>
        </div>
      )}

      {/* Project Type Selection */}
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
                  projectType === type.value
                    ? 'bg-cyan-500/20 border-cyan-500/40 shadow-lg'
                    : 'bg-gray-700/30 border-gray-600/40 hover:border-gray-500/60'
                }`}
              >
                <input
                  type="radio"
                  name="projectType"
                  value={type.value}
                  checked={projectType === type.value}
                  onChange={(e) => setProjectType(e.target.value as 'nextjs' | 'fastapi' | 'other')}
                  className="sr-only"
                />
                <Icon className={`w-6 h-6 mb-2 ${projectType === type.value ? 'text-cyan-400' : type.color}`} />
                <span className={`text-sm font-medium ${projectType === type.value ? 'text-cyan-300' : 'text-gray-300'}`}>
                  {type.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Project Name and Port - Compact Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., My Next.js App"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            maxLength={50}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Port *
          </label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value) || 3000)}
            min="1000"
            max="65535"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            required
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of your project..."
          rows={2}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
          maxLength={200}
        />
      </div>

      {/* FastAPI Related Project */}
      {projectType === 'fastapi' && nextjsProjects.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Related Next.js Project (Optional)
          </label>
          <div className="relative">
            <select
              value={relatedProjectId}
              onChange={(e) => setRelatedProjectId(e.target.value)}
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
          <div className="text-xs text-gray-500 mt-1">
            Link this FastAPI backend to a Next.js frontend
          </div>
        </div>
      )}

      {/* Git Repository and Branch - Compact Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            GitHub Repository (Optional)
          </label>
          <input
            type="url"
            value={gitRepository}
            onChange={(e) => setGitRepository(e.target.value)}
            placeholder="https://github.com/username/repository.git"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>
        {gitRepository && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Branch
            </label>
            <input
              type="text"
              value={gitBranch}
              onChange={(e) => setGitBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
          </div>
        )}
      </div>

      {/* Run Script */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Run Script
        </label>
        <input
          type="text"
          value={runScript}
          onChange={(e) => setRunScript(e.target.value)}
          placeholder="npm run dev"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
        <div className="text-xs text-gray-500 mt-1">
          Command to start the development server
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}