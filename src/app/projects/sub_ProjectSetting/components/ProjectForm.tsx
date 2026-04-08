import React from 'react';
import { FolderOpen, Settings2, GitBranch, Terminal } from 'lucide-react';
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
  ErrorDisplay,
  FormSection
} from '../../sub_ProjectForm';
import type { ProjectFormProps } from '../../sub_ProjectForm';
import { useProjectForm } from '../../sub_ProjectForm';

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
  const form = useProjectForm({
    initialData,
    isEdit,
    workspaceId,
    workspaceBasePath,
    onSubmit,
    onTypeChange,
  });

  return (
    <form id="project-form" onSubmit={form.handleSubmit} className="space-y-4">
      {/* Section 1: Project Location */}
      <FormSection
        title="Project Location"
        icon={FolderOpen}
        description={isEdit ? undefined : "Select the folder containing your project"}
      >
        {!isEdit && (
          <PathSelection
            directories={form.directories}
            selectedPath={form.selectedPath}
            onPathSelect={form.setSelectedPath}
            onAutoFillName={form.setProjectName}
            projectName={form.projectName}
            parentPath={form.parentPath}
            loading={form.loadingDirectories}
          />
        )}
        {isEdit && <PathDisplay path={form.selectedPath} />}
      </FormSection>

      {/* Section 2: Project Configuration */}
      <FormSection
        title="Configuration"
        icon={Settings2}
        description="Define the project type and identity"
      >
        <ProjectTypeSelector
          selectedType={form.projectType}
          onTypeSelect={form.handleTypeChange}
          isEdit={isEdit}
        />

        <ProjectNameInput
          value={form.projectName}
          onChange={form.setProjectName}
        />

        {/* Port Selection - Hidden for Combined type */}
        {form.projectType !== 'combined' && (
          form.projectType === 'generic' ? (
            <PortInput
              value={form.port}
              onChange={form.setPort}
            />
          ) : (
            <ProjectPortSelection
              projectType={form.projectType}
              selectedPort={form.port}
              onPortSelect={form.setPort}
            />
          )
        )}

        {/* FastAPI Related Project */}
        {form.projectType === 'fastapi' && (
          <RelatedProjectSelector
            value={form.relatedProjectId}
            onChange={form.setRelatedProjectId}
            nextjsProjects={form.nextjsProjects}
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
          repository={form.gitRepository}
          branch={form.gitBranch}
          onRepositoryChange={form.setGitRepository}
          onBranchChange={form.setGitBranch}
        />
      </FormSection>

      {/* Section 4: Run Configuration */}
      <FormSection
        title="Run Script"
        icon={Terminal}
        description="Command to start the development server"
      >
        <RunScriptInput
          value={form.runScript}
          onChange={form.setRunScript}
        />
      </FormSection>

      {/* Error Message */}
      <ErrorDisplay error={error} />
    </form>
  );
}
