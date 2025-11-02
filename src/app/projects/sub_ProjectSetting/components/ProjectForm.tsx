import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
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

export default function ProjectForm({
  initialData,
  onSubmit,
  onTypeChange,
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
    <form id="project-form" onSubmit={handleSubmit} className="space-y-6">

      {/* Path Selection - Only show for new projects */}
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

      {/* Path Display for Edit Mode */}
      {isEdit && <PathDisplay path={selectedPath} />}

      {/* Project Type Selection */}
      <ProjectTypeSelector
        selectedType={projectType}
        onTypeSelect={handleTypeChange}
        isEdit={isEdit}
      />

      {/* Project Name */}
      <ProjectNameInput
        value={projectName}
        onChange={setProjectName}
      />

      {/* Port Selection */}
      {projectType === 'other' ? (
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
      )}

      {/* FastAPI Related Project */}
      {projectType === 'fastapi' && (
        <RelatedProjectSelector
          value={relatedProjectId}
          onChange={setRelatedProjectId}
          nextjsProjects={nextjsProjects}
        />
      )}

      {/* Git Repository and Branch */}
      <GitConfigInputs
        repository={gitRepository}
        branch={gitBranch}
        onRepositoryChange={setGitRepository}
        onBranchChange={setGitBranch}
      />

      {/* Run Script */}
      <RunScriptInput
        value={runScript}
        onChange={setRunScript}
      />

      {/* Error Message */}
      <ErrorDisplay error={error} />
    </form>
  );
}
