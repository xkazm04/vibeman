import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useServerProjectStore } from '../../../../stores/serverProjectStore';
import type { Directory, DirectoriesResponse, ProjectFormData, ProjectFormProps, ProjectType } from '../types';
import { PROJECT_TYPES } from '../config';

interface UseProjectFormOptions {
  initialData?: ProjectFormData;
  isEdit?: boolean;
  workspaceId?: string | null;
  workspaceBasePath?: string | null;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onTypeChange?: (type: ProjectType) => Promise<void>;
}

export function useProjectForm({
  initialData,
  isEdit = false,
  workspaceId,
  workspaceBasePath,
  onSubmit,
  onTypeChange,
}: UseProjectFormOptions) {
  const { projects } = useServerProjectStore();
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

  const loadDirectories = useCallback(async (customBasePath?: string) => {
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
  }, [workspaceBasePath]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [selectedPath, projectName, projectType, port, initialData, workspaceId, relatedProjectId, gitRepository, gitBranch, runScript, onSubmit]);

  const handleTypeChange = useCallback((newType: ProjectType) => {
    setProjectType(newType);
    // Immediately update type in database when editing
    if (isEdit && onTypeChange) {
      onTypeChange(newType);
    }
  }, [isEdit, onTypeChange]);

  return {
    // Directory loading
    loadingDirectories,
    directories,
    parentPath,

    // Form fields
    selectedPath,
    setSelectedPath,
    projectName,
    setProjectName,
    port,
    setPort,
    projectType,
    relatedProjectId,
    setRelatedProjectId,
    gitRepository,
    setGitRepository,
    gitBranch,
    setGitBranch,
    runScript,
    setRunScript,

    // Derived
    nextjsProjects,

    // Handlers
    handleSubmit,
    handleTypeChange,
  };
}
