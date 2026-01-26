import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { FolderOpen, Settings2, GitBranch, Terminal } from 'lucide-react';
import { useProjectConfigStore } from '../../../../stores/projectConfigStore';
import ProjectPortSelection from './ProjectPortSelection';
import {
  PathSelection,
  PathDisplay,
  ProjectTypeSelector,
  ProjectNameInput,
  PortInput,
  RelatedProjectSelector,
  GitConfigInputs,
  RunScriptInput,
  ErrorDisplay
} from '../../sub_ProjectForm';
import type {
  Directory,
  DirectoriesResponse,
  ProjectFormData,
  ProjectFormProps,
  ProjectType
} from '../../sub_ProjectForm';
import { PROJECT_TYPES } from '../../sub_ProjectForm';

// Section wrapper component for consistent styling
function FormSection({
  title,
  icon: Icon,
  children,
  description,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/40 border border-gray-700/40 rounded-xl overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-700/40 bg-gray-800/60">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <div className="p-4 space-y-4">
        {children}
      </div>
    </motion.div>
  );
}

export default function ProjectForm({
  initialData,
  onSubmit,
  onTypeChange,
  loading,
  error,
  isEdit = false,
  workspaceId,
  workspaceBasePath
}: ProjectFormProps) {
  const { projects } = useProjectConfigStore();
  const [loadingDirectories, setLoadingDirectories] = useState(false);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [parentPath, setParentPath] = useState(workspaceBasePath || '');

  // Form state
  const [selectedPath, setSelectedPath] = useState(initialData?.path || '');
  const [projectName, setProjectName] = useState(initialData?.name || '');
  const [port, setPort] = useState(initialData?.port || 3000);
  const [projectType, setProjectType] = useState<ProjectType>(initialData?.type || 'nextjs');
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

  const loadDirectories = async (customBasePath?: string) => {
    setLoadingDirectories(true);
    try {
      // Use workspace base path if provided, otherwise use default
      const basePath = customBasePath || workspaceBasePath;
      const url = basePath
        ? `/api/projects/directories?basePath=${encodeURIComponent(basePath)}`
        : '/api/projects/directories';

      const response = await fetch(url);
      const data: DirectoriesResponse = await response.json();

      if (data.success) {
        setDirectories(data.directories);
        setParentPath(data.parentPath);
      }
    } catch (error) {
      // Error loading directories - silently continue
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

    // Validate port only for non-combined types
    const isCombined = projectType === 'combined';
    if (!isCombined && (port < 1000 || port > 65535)) {
      return;
    }

    const projectData: ProjectFormData = {
      id: initialData?.id || uuidv4(),
      name: projectName.trim(),
      path: selectedPath,
      port: isCombined ? undefined : port,
      workspaceId: workspaceId || undefined,
      type: projectType,
      relatedProjectId: projectType === 'fastapi' && relatedProjectId ? relatedProjectId : undefined,
      git_repository: gitRepository.trim() || undefined,
      git_branch: gitBranch.trim() || 'main',
      run_script: runScript.trim() || 'npm run dev'
    };

    await onSubmit(projectData);
  };

  const handleTypeChange = (newType: ProjectType) => {
    setProjectType(newType);
    // Immediately update type in database when editing
    if (isEdit && onTypeChange) {
      onTypeChange(newType);
    }
  };

  return (
    <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Section 1: Project Location */}
      <FormSection
        title="Project Location"
        icon={FolderOpen}
        description={isEdit ? undefined : "Select the folder containing your project"}
      >
        {!isEdit && (
          <PathSelection
            directories={directories}
            selectedPath={selectedPath}
            onPathSelect={setSelectedPath}
            onAutoFillName={setProjectName}
            projectName={projectName}
            parentPath={parentPath}
            loading={loadingDirectories}
          />
        )}
        {isEdit && <PathDisplay path={selectedPath} />}
      </FormSection>

      {/* Section 2: Project Configuration */}
      <FormSection
        title="Configuration"
        icon={Settings2}
        description="Define the project type and identity"
      >
        <ProjectTypeSelector
          selectedType={projectType}
          onTypeSelect={handleTypeChange}
          isEdit={isEdit}
        />

        <ProjectNameInput
          value={projectName}
          onChange={setProjectName}
        />

        {/* Port Selection - Hidden for Combined type */}
        {projectType !== 'combined' && (
          projectType === 'generic' ? (
            <PortInput
              value={port}
              onChange={setPort}
            />
          ) : (
            <ProjectPortSelection
              projectType={projectType}
              selectedPort={port}
              onPortSelect={setPort}
            />
          )
        )}

        {/* FastAPI Related Project */}
        {projectType === 'fastapi' && (
          <RelatedProjectSelector
            value={relatedProjectId}
            onChange={setRelatedProjectId}
            nextjsProjects={nextjsProjects}
          />
        )}
      </FormSection>

      {/* Section 3: Git Integration (Collapsible optional) */}
      <FormSection
        title="Git Integration"
        icon={GitBranch}
        description="Link to a GitHub repository (optional)"
      >
        <GitConfigInputs
          repository={gitRepository}
          branch={gitBranch}
          onRepositoryChange={setGitRepository}
          onBranchChange={setGitBranch}
        />
      </FormSection>

      {/* Section 4: Run Configuration */}
      <FormSection
        title="Run Script"
        icon={Terminal}
        description="Command to start the development server"
      >
        <RunScriptInput
          value={runScript}
          onChange={setRunScript}
        />
      </FormSection>

      {/* Error Message */}
      <ErrorDisplay error={error} />
    </form>
  );
}
